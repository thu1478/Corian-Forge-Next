"use client"

import { CharacterSaveData } from "@/lib/character-data"
import { Sparkles } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface FeaturesProps {
  features: CharacterSaveData['features']
}

export function Features({ features }: FeaturesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Features & Traits</h3>
      </div>
      
      <Accordion type="single" collapsible className="space-y-1">
        {features.map((feature, index) => (
          <AccordionItem 
            key={feature.name} 
            value={`feature-${index}`}
            className="border border-border rounded-lg px-3 bg-secondary/30"
          >
            <AccordionTrigger className="hover:no-underline py-2">
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-medium text-foreground">{feature.name}</span>
                <span className="text-xs text-muted-foreground">{feature.source}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-3">
              {feature.description}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
