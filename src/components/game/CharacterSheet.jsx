import { TIER_CONFIG, MASTER_FORMS, TIER_ORDER, MATERIAL_RARITY, MATERIAL_COLORS } from "./gameData";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import StatBar from "./StatBar";

export default function CharacterSheet({ character, onClose }) {
  const cfg = TIER_CONFIG[character.tier];
  const apProgress = cfg.apToEvolve === Infinity ? 100 : Math.min((character.assimilationPoints / cfg.apToEvolve) * 100, 100);

  const activeForms = (character.forms || []).map(ref => {
    for (const tier of TIER_ORDER) {
      const found = MASTER_FORMS[tier]?.find(f => f.id === ref.formId);
      if (found) return { ...found, formRef: ref };
    }
    return null;
  }).filter(Boolean);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="font-cinzel text-xl text-foreground">{character.name}</CardTitle>
          <p className="text-xs text-muted-foreground">{character.startingType} Origin · {character.tier} Tier</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Lore */}
        <p className="flavor-text text-xs text-muted-foreground/70 italic">{cfg.lore}</p>

        {/* Stats */}
        <div>
          <p className="text-[10px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">Stats</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <StatBar label="Plausibility" value={character.plausibility} max={6} color="bg-green-500" />
            <StatBar label="Adhesion" value={character.adhesion} max={6} color="bg-primary" />
            <StatBar label="Patience" value={character.patience} max={6} color="bg-purple-500" />
            <StatBar label="Allure Base" value={character.baseAllure} max={6} color="bg-yellow-500" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {[
              ["Mass", character.mass],
              ["Capacity", character.digestiveCapacity],
              ["AP", character.assimilationPoints],
            ].map(([label, val]) => (
              <div key={label} className="bg-muted/30 rounded border border-border py-2">
                <div className="text-base font-bold text-foreground">{val}</div>
                <div className="text-[9px] text-muted-foreground font-cinzel uppercase">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier progress */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="font-cinzel text-muted-foreground uppercase tracking-widest">Evolution</span>
            <span className="text-foreground">{character.assimilationPoints} / {cfg.apToEvolve === Infinity ? "MAX" : cfg.apToEvolve} AP</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${apProgress}%` }} />
          </div>
        </div>

        {/* Forms */}
        {activeForms.length > 0 && (
          <div>
            <p className="text-[10px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">Known Forms</p>
            <div className="space-y-2">
              {activeForms.map((form, i) => (
                <div key={form.id} className={`p-2.5 rounded border text-xs ${i === (character.activeFormIndex ?? 0) ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-cinzel text-foreground">{form.name}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[9px] border-border text-muted-foreground">{form.tier}</Badge>
                      {i === (character.activeFormIndex ?? 0) && (
                        <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 border">Active</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{form.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Learned Materials */}
        {(character.learnedMaterials || []).length > 0 && (
          <div>
            <p className="text-[10px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">
              Known Materials ({character.learnedMaterials.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {character.learnedMaterials.map(mat => {
                const rarity = MATERIAL_RARITY?.[mat] || "mundane";
                return (
                  <span key={mat} className={`text-[10px] px-2 py-0.5 rounded border ${MATERIAL_COLORS[rarity] ?? MATERIAL_COLORS.mundane}`}>
                    {mat}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Learned Traits */}
        {(character.learnedTraits || []).length > 0 && (
          <div>
            <p className="text-[10px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">Known Traits</p>
            <div className="flex flex-wrap gap-1.5">
              {character.learnedTraits.map(t => (
                <Badge key={t} variant="outline" className="text-[10px] border-accent/30 text-accent-foreground">{t}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Current Appearance */}
        {character.currentAppearance && (
          <div>
            <p className="text-[10px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">Current Appearance</p>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {(character.currentAppearance.primaryMaterials || []).length > 0 && (
                <p>Primary: <span className="text-foreground">{character.currentAppearance.primaryMaterials.join(", ")}</span></p>
              )}
              {(character.currentAppearance.secondaryMaterials || []).length > 0 && (
                <p>Secondary: <span className="text-foreground">{character.currentAppearance.secondaryMaterials.join(", ")}</span></p>
              )}
              {(character.currentAppearance.surfaceTraits || []).length > 0 && (
                <p>Traits: <span className="text-foreground">{character.currentAppearance.surfaceTraits.join(", ")}</span></p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}