import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { ACHIEVEMENTS, achievementsShown, displayTier, lifetimeStats, nameFlavor, tierFlavor, TIER_CONFIG, ALL_FORMS, MATERIAL_RARITY, MATERIAL_COLORS, effectiveFormTier, formTier } from "@/data/gameData";
import HolidayBadge from "./HolidayBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import StatBar from "./StatBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AchievementList } from "./Achievements";

interface CharacterSheetProps {
  character: MimicCharacter;
  onClose?: () => void;
}

export default function CharacterSheet({ character, onClose }: CharacterSheetProps) {
  const cfg = TIER_CONFIG[character.tier];
  const apProgress = Math.min((character.assimilationPoints / cfg.apToEvolve) * 100, 100);

  const activeForms = character.forms.flatMap(ref => {
    const found = ALL_FORMS.find(f => f.id === ref.formId);
    return found ? [{ ...found, formRef: ref }] : [];
  });

  return (
    // The card is the frame: the header (name, Close) stays put and only the body scrolls, with a
    // slim scrollbar kept inside the card, clear of its rounded corners
    <Card className="bg-card border-border flex max-h-[90vh] flex-col overflow-hidden">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="font-cinzel text-xl text-foreground">{character.name}</CardTitle>
          {nameFlavor(character.name) && (
            <p className="text-xs text-muted-foreground/80 italic flavor-text">{nameFlavor(character.name)}</p>
          )}
          <p className="text-xs text-muted-foreground">{character.startingType} Origin · {displayTier(character)} Tier</p>
          {/* Lore */}
          <p className="flavor-text text-xs text-muted-foreground/70 italic">{tierFlavor(character).lore}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <ScrollArea type="auto" className="flex min-h-0 flex-1 flex-col" viewportClassName="min-h-0 flex-1" scrollbarClassName="pb-3 pr-1">
        <CardContent className="space-y-5">
          {/* Stats */}
          <div>
            <p className="text-[11px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">Stats</p>
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
                  <div className="text-[10px] text-muted-foreground font-cinzel uppercase">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tier progress */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-cinzel text-muted-foreground uppercase tracking-widest">Evolution</span>
              <span className="text-foreground">{character.assimilationPoints} / {cfg.apToEvolve} AP</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${apProgress}%` }} />
            </div>
          </div>

          {/* Forms */}
          {activeForms.length > 0 && (
            <div>
              <p className="text-[11px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">Known Forms</p>
              <div className="space-y-2">
                {activeForms.map((form, i) => (
                  <div key={form.id} data-holiday={form.holiday} className={`${form.holiday ? "holiday-card" : ""} p-2.5 rounded border text-xs ${i === (character.activeFormIndex ?? 0) ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-cinzel text-foreground">{form.name}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{effectiveFormTier(form, formTier(character))}</Badge>
                        {i === (character.activeFormIndex ?? 0) && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border">Active</Badge>
                        )}
                      </div>
                    </div>
                    <HolidayBadge form={form} />
                    <p className="text-muted-foreground mt-0.5">{form.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learned Materials */}
          {(character.learnedMaterials || []).length > 0 && (
            <div>
              <p className="text-[11px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">
                Known Materials ({character.learnedMaterials.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {character.learnedMaterials.map(mat => {
                  const rarity = MATERIAL_RARITY[mat];
                  return (
                    <span key={mat} className={`text-[11px] px-2 py-0.5 rounded border ${MATERIAL_COLORS[rarity]}`}>
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
              <p className="text-[11px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">Known Traits</p>
              <div className="flex flex-wrap gap-1.5">
                {character.learnedTraits.map(t => (
                  <Badge key={t} variant="outline" className="text-[11px] border-accent/30 text-accent-foreground">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Current Appearance */}
          {character.currentAppearance && (
            <div>
              <p className="text-[11px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">Current Appearance</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {(character.currentAppearance.primaryMaterials || []).length > 0 && (
                  <p>Primary: <span className="text-foreground">{character.currentAppearance.primaryMaterials.join(", ")}</span></p>
                )}
                {(character.currentAppearance.secondaryMaterials || []).length > 0 && (
                  <p>Secondary: <span className="text-foreground">{character.currentAppearance.secondaryMaterials.join(", ")}</span></p>
                )}
                {(character.currentAppearance.surfaceTraits || []).length > 0 && (
                  <p>Surface: <span className="text-foreground">{character.currentAppearance.surfaceTraits.join(", ")}</span></p>
                )}
                {(character.currentAppearance.symbolicTraits || []).length > 0 && (
                  <p>Symbolic: <span className="text-foreground">{character.currentAppearance.symbolicTraits.join(", ")}</span></p>
                )}
                {(character.currentAppearance.conditionTraits || []).length > 0 && (
                  <p>Condition: <span className="text-foreground">{character.currentAppearance.conditionTraits.join(", ")}</span></p>
                )}
                {(character.currentAppearance.scentTraits || []).length > 0 && (
                  <p>Scent: <span className="text-foreground">{character.currentAppearance.scentTraits.join(", ")}</span></p>
                )}
              </div>
            </div>
          )}

          {/* Lifetime stats */}
          {(() => {
            const stats = lifetimeStats(character);
            const rows: [string, string | number][] = [
              ["Hunts survived", stats.huntsSurvived],
              ["Hunts failed", stats.huntsFailed],
              ["Hunts total", stats.huntsTotal],
              ["Entities eaten", stats.entitiesEaten],
              ["Forms used", stats.formsUsed],
              ["Lifetime AP earned", stats.lifetimeApEarned],
              ["Closest call", stats.huntsSurvived > 0 ? `${stats.closestCall}/10 suspicion` : "—"],
              ["Biggest meal", stats.biggestMeal ? `${stats.biggestMeal.name} (${stats.biggestMeal.ap} AP)` : "—"],
              ["Favorite form", stats.favoriteForm ? `${stats.favoriteForm.name} (${stats.favoriteForm.hunts})` : "—"],
              ["Favorite hunting ground", stats.favoriteHuntingGround ? `${stats.favoriteHuntingGround.name} (${stats.favoriteHuntingGround.hunts})` : "—"],
            ];
            return (
              <div>
                <p className="text-[11px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">Lifetime Stats</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {rows.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">{label}</span>
                      <span className="text-foreground font-bold text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Achievements */}
          <div>
            <p className="text-[11px] font-cinzel text-muted-foreground uppercase tracking-widest mb-2">
              Achievements ({ACHIEVEMENTS.filter(a => a.isEarned(character)).length}/{achievementsShown([character]).length})
            </p>
            <AchievementList character={character} />
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}