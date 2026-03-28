"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { User, BookOpen, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface CharacterProfileProps {
  name: string
  race: string
  age: number
  gender: string
  background: string
  backstory: string
  profileImage?: string
  onProfileImageChange?: (url: string) => void
  onBackstoryChange?: (backstory: string) => void
}

export function CharacterProfile({ 
  name, 
  race, 
  age, 
  gender, 
  background, 
  backstory, 
  profileImage,
  onProfileImageChange,
  onBackstoryChange
}: CharacterProfileProps) {
  const [isEditingBackstory, setIsEditingBackstory] = useState(false)
  const [editBackstory, setEditBackstory] = useState(backstory)
  const [imageUrl, setImageUrl] = useState(profileImage || "")
  const [showImageInput, setShowImageInput] = useState(false)

  const handleBackstorySave = () => {
    onBackstoryChange?.(editBackstory)
    setIsEditingBackstory(false)
  }

  const handleImageSave = () => {
    onProfileImageChange?.(imageUrl)
    setShowImageInput(false)
  }

  return (
    <div className="space-y-4">
      {/* Profile Image & Basic Info */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Character Profile
        </h3>

        <div className="flex gap-5">
          {/* Profile Image */}
          <div className="shrink-0">
            <div 
              className={cn(
                "w-36 h-36 rounded-lg border-2 border-dashed border-border overflow-hidden",
                "flex items-center justify-center bg-muted/30 relative group cursor-pointer"
              )}
              onClick={() => setShowImageInput(true)}
            >
              {profileImage ? (
                <>
                  <img 
                    src={profileImage} 
                    alt={name} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="text-center p-2">
                  <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add Image</span>
                </div>
              )}
            </div>

            {showImageInput && (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  placeholder="Image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-36 text-sm p-2 rounded border border-border bg-background"
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="default" className="h-7 text-sm flex-1" onClick={handleImageSave}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowImageInput(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{name}</h2>
              <p className="text-base text-muted-foreground">{race} | {age} years old | {gender}</p>
            </div>
            
            <div className="p-4 bg-muted/20 rounded-lg border border-border">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Background</span>
              <p className="text-base font-medium text-foreground mt-1">{background}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Backstory */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Backstory
          </h3>
          {!isEditingBackstory && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 text-sm"
              onClick={() => {
                setEditBackstory(backstory)
                setIsEditingBackstory(true)
              }}
            >
              Edit
            </Button>
          )}
        </div>

        {isEditingBackstory ? (
          <div className="space-y-3">
            <Textarea
              value={editBackstory}
              onChange={(e) => setEditBackstory(e.target.value)}
              className="min-h-[200px] text-base leading-relaxed"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setIsEditingBackstory(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleBackstorySave}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-base dark:prose-invert max-w-none">
            {backstory.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-base text-foreground/80 leading-relaxed mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
