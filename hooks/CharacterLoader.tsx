import {defaultCharacter, type CharacterSaveData} from '@/lib/character-data';
import {sanitizeBondTargetsFromCharacterJson} from '@/lib/bonds';
import rulesData from '@/lib/rules.json';
import {useCallback, useEffect, useRef, useState} from 'react';

/** Browser key for persisted sheet character (bump version if save shape changes). */
export const CHARACTER_STORAGE_KEY = 'corian-forge.character.v1';

const SAVE_DEBOUNCE_MS = 300;

function prepareCharacterFromImportedJson(json: Record<string, unknown>): CharacterSaveData {
    const loaded = {...json};
    delete loaded.bonds;
    loaded.bondTargets = sanitizeBondTargetsFromCharacterJson(loaded, rulesData.system);
    if (!Array.isArray(loaded.creatures)) loaded.creatures = [];
    return loaded as unknown as CharacterSaveData;
}

export function useCharacterIO() {
    const [character, setCharacter] = useState(defaultCharacter);
    const [storageReady, setStorageReady] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem(CHARACTER_STORAGE_KEY) : null;
            if (raw) {
                const json = JSON.parse(raw) as Record<string, unknown>;
                if (json && typeof json === 'object' && !Array.isArray(json)) {
                    setCharacter(prepareCharacterFromImportedJson(json));
                }
            }
        } catch (err) {
            console.error('Failed to restore character from localStorage', err);
            try {
                localStorage.removeItem(CHARACTER_STORAGE_KEY);
            } catch {
                /* ignore */
            }
        } finally {
            setStorageReady(true);
        }
    }, []);

    useEffect(() => {
        if (!storageReady || typeof window === 'undefined') return;

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            saveTimerRef.current = null;
            try {
                localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(character));
            } catch (err) {
                console.error('Failed to persist character to localStorage', err);
            }
        }, SAVE_DEBOUNCE_MS);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [character, storageReady]);

    const importJSON = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string) as Record<string, unknown>;
                setCharacter(prepareCharacterFromImportedJson(json));
            } catch (err) {
                console.error('Failed to parse character JSON', err);
            }
        };
        reader.readAsText(file);
    };

    const exportJSON = () => {
        const dataStr = JSON.stringify(character, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${character.name || 'character'}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const clearSavedCharacter = useCallback(() => {
        try {
            localStorage.removeItem(CHARACTER_STORAGE_KEY);
        } catch {
            /* ignore */
        }
        setCharacter(defaultCharacter);
    }, []);

    return {character, setCharacter, importJSON, exportJSON, clearSavedCharacter};
}
