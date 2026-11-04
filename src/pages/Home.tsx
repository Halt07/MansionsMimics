import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/db";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { TIER_ORDER, TIER_CONFIG } from "../components/game/gameData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, BookOpen, Sword, User, Trophy } from "lucide-react";

export default function Home() {
  const [characters, setCharacters] = useState<MimicCharacter[]>([]);
  const [peakMimics, setPeakMimics] = useState<MimicCharacter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      db.entities.MimicCharacter.list("-created_date", 5),
      db.entities.MimicCharacter.filter({ apexPeakReached: true }, "-updated_date", 3),
    ]).then(([chars, peaks]) => {
      setCharacters(chars);
      setPeakMimics(peaks);
    }).catch(err => {
      console.error("Failed to load saved mimics:", err);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/20 via-background to-background pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-cinzel tracking-widest uppercase">
            A Text-Based RPG
          </div>
          <h1 className="text-5xl md:text-7xl font-cinzel font-bold text-foreground mb-4 gold-glow leading-tight">
            Mansions &<br />
            <span className="text-primary">Mimics</span>
          </h1>
          <p className="flavor-text text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            You are not the hero. You are not the villain.<br />
            You are the <em>room</em>.
          </p>
          <p className="text-muted-foreground max-w-xl mx-auto mb-10 text-sm md:text-base">
            Play as a mimic evolving from a humble trinket to an entire building. Lure adventurers.
            Feed. Assimilate. Grow. Keep suspicion low — or be hunted.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/80 font-cinzel text-lg px-8 py-6">
              <Link to={createPageUrl("CharacterCreation")}>Begin Your Hunger</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border hover:border-primary/50 font-cinzel px-8 py-6">
              <Link to={createPageUrl("Codex")}>Read the Codex</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Feature pillars */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {[
            { icon: Eye, title: "Deception", desc: "Master the art of plausibility. Your survival depends on how convincingly you imitate the real." },
            { icon: Sword, title: "Consumption", desc: "Lure adventurers close. Feed. Each meal brings assimilation points and new materials to learn." },
            { icon: BookOpen, title: "Evolution", desc: "Spend assimilation to grow your mass, raise your tier, or sharpen your stats." },
          ].map(({ icon: PillarIcon, title, desc }) => (
            <Card key={title} className="bg-card border-border parchment">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <PillarIcon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-cinzel text-lg text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tier preview */}
        <div className="mb-16">
          <h2 className="font-cinzel text-2xl text-center text-foreground mb-2">The Path of Growth</h2>
          <p className="text-center text-muted-foreground text-sm mb-8 flavor-text">From candlestick to cathedral — every meal matters.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {TIER_ORDER.map((tier, i) => (
              <div key={tier} className="flex items-center gap-2">
                <div className={`px-4 py-2 rounded-lg border text-sm font-cinzel
                  ${i === 0 ? "border-muted bg-muted/20 text-muted-foreground" :
                    i === 5 ? "border-primary bg-primary/10 text-primary" :
                    "border-border bg-card text-foreground"}`}>
                  {tier}
                </div>
                {i < TIER_ORDER.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Saved characters */}
        {!loading && characters.length > 0 && (
          <div className="mb-12">
            <h2 className="font-cinzel text-2xl text-foreground mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Your Mimics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map(char => (
                <Card key={char.id} className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-cinzel text-foreground group-hover:text-primary transition-colors">{char.name}</h3>
                      <div className="flex items-center gap-1">
                        {char.hatboxToLegendReached && <span title="From Hatbox to Legend">📦</span>}
                        {char.apexPeakReached && <span title="Peak of the Apex">🏆</span>}
                        {char.titanicFeastReached && <span title="Titanic Feast">🍖</span>}
                        <span className="text-xs px-2 py-0.5 rounded border border-primary/30 bg-primary/5 text-primary font-cinzel">
                          {char.tier}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {TIER_CONFIG[char.tier].description}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>PL: {char.plausibility}</span>
                      <span>AD: {char.adhesion}</span>
                      <span>PA: {char.patience}</span>
                    </div>
                    <Button asChild className="w-full mt-3 h-8 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20" variant="ghost">
                      <Link to={createPageUrl(`Game?characterId=${char.id}`)}>Continue</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Hall of Fame */}
        {peakMimics.length > 0 && (
          <div className="mb-12">
            <h2 className="font-cinzel text-2xl text-foreground mb-1 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Peak of the Apex
            </h2>
            <p className="text-muted-foreground text-sm mb-6 flavor-text italic">
              These mimics reached mass 40 — the pinnacle of predatory evolution. Cartographers have stopped trying.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {peakMimics.map(char => (
                <Card key={char.id} className="bg-card border-primary/30 parchment">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-1">🏆</div>
                    <h3 className="font-cinzel text-primary mb-0.5">{char.name}</h3>
                    <p className="text-xs text-muted-foreground">Mass {char.mass} · Apex Tier</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 flavor-text italic">
                      PL {char.plausibility} · AD {char.adhesion} · PA {char.patience}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer lore */}
      <div className="border-t border-border py-8 text-center">
        <p className="flavor-text text-muted-foreground text-sm max-w-md mx-auto">
          "The adventurers called it haunted. The scholars called it cursed. The mimic called it home."
        </p>
      </div>
    </div>
  );
}