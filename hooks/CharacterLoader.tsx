import { Character, defaultCharacter } from '@/lib/character-data';
import { ChangeEvent, ChangeEventHandler, useState } from 'react';

export function useCharacterIO() {
    const [character, setCharacter] = useState(defaultCharacter);

    // Use ChangeEventHandler<HTMLInputElement> here
    const importJSON = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                setCharacter(json);
            } catch (err) {
                console.error("Failed to parse character JSON", err);
            }
        };
        reader.readAsText(file);
    }

    const exportJSON = () => {
        const dataStr = JSON.stringify(character, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${character.name || 'character'}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return { character, setCharacter, importJSON, exportJSON };
}