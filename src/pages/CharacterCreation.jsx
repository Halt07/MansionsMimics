import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/db";
import {
  STARTING_STATS, TIER_CONFIG, MASTER_FORMS, TRAITS, TIER_ORDER, canAddForm, MAX_FORMS_ABOVE_TIER
} from "../components/game/gameData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Check, AlertCircle } from "lucide-react";
import StatBar from "../components/game/StatBar";

const STEPS = ["Origin", "Name", "Forms", "Appearance", "Confirm"];

const STARTING_MATERIALS = {
  Minor: ["Oak", "Iron", "Cotton"],
  Lesser: ["Oak", "Iron", "Cowhide"],
};

export default function CharacterCreation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [origin, setOrigin] = useState(null); // "Minor" | "Lesser"

  const handleOriginSelect = (type) => {
    setOrigin(type);
    setSelectedForms([]); // reset forms when origin changes
  };
  const [name, setName] = useState("");
  const [selectedForms, setSelectedForms] = useState([]);
  const [appearance, setAppearance] = useState({
    primaryMaterials: [],
    secondaryMaterials: [],
    surfaceTraits: [],
    symbolicTraits: [],
    conditionTraits: [],
  });

  // Forms available at creation: same tier as origin, plus one tier above (±1 rule)
  // Minor origin starts at Minor tier; Lesser origin starts at Lesser tier
  const startingTier = origin || "Minor";
  const tierIndex = TIER_ORDER.indexOf(startingTier);
  const availableForms = TIER_ORDER.reduce((acc, tier, i) => {
    if (Math.abs(i - tierIndex) <= 1) return [...acc, ...(MASTER_FORMS[tier] || [])];
    return acc;
  }, []);

  const canProceed = () => {
    if (step === 0) return !!origin;
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return selectedForms.length === 2;
    if (step === 3) return appearance.primaryMaterials.length > 0;
    return true;
  };

  const toggleForm = (form) => {
    if (selectedForms.find(f => f.id === form.id)) {
      setSelectedForms(selectedForms.filter(f => f.id !== form.id));
    } else if (selectedForms.length < 2 && canAddForm(selectedForms, form, startingTier)) {
      setSelectedForms([...selectedForms, { ...form, learned: true }]);
    }
  };

  const toggleTrait = (category, trait) => {
    const current = appearance[category] || [];
    if (current.includes(trait)) {
      setAppearance({ ...appearance, [category]: current.filter(t => t !== trait) });
    } else if (current.length < 1) {
      setAppearance({ ...appearance, [category]: [...current, trait] });
    }
  };

  // Starting mimics may pick one material per slot, so a new pick replaces the old one.
  const toggleMaterial = (field, mat) => {
    const current = appearance[field] || [];
    setAppearance({ ...appearance, [field]: current.includes(mat) ? [] : [mat] });
  };

  const handleCreate = async () => {
    if (!origin || !name.trim() || selectedForms.length < 2) return;
    setSaving(true);
    setSaveError(null);
    const stats = STARTING_STATS[origin];
    const startingMats = STARTING_MATERIALS[origin];
    const charData = {
      name: name.trim(),
      tier: origin, // start AS the chosen tier
      startingType: origin,
      mass: stats.mass,
      digestiveCapacity: stats.digestiveCapacity,
      patience: stats.patience,
      adhesion: stats.adhesion,
      plausibility: stats.plausibility,
      assimilationPoints: 0,
      baseAllure: stats.baseAllure,
      forms: selectedForms.map(f => ({ formId: f.id, name: f.name, tier: f.tier, learned: true })),
      activeFormIndex: 0,
      learnedMaterials: startingMats,
      learnedTraits: [],
      currentAppearance: {
        primaryMaterials: appearance.primaryMaterials.length ? appearance.primaryMaterials : [startingMats[0]],
        secondaryMaterials: appearance.secondaryMaterials,
        surfaceTraits: appearance.surfaceTraits || [],
        symbolicTraits: appearance.symbolicTraits || [],
        conditionTraits: appearance.conditionTraits || [],
      },
      isActive: true,
    };
    try {
      const created = await db.entities.MimicCharacter.create(charData);
      navigate(createPageUrl(`Game?characterId=${created.id}`));
    } catch (err) {
      console.error("Failed to create character:", err);
      setSaveError(err?.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const stats = origin ? STARTING_STATS[origin] : null;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-cinzel text-3xl text-foreground mb-2">Awaken</h1>
          <p className="flavor-text text-muted-foreground">Something stirs in the dark. Define what it is.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all
                ${i < step ? "bg-primary border-primary text-primary-foreground" :
                  i === step ? "border-primary text-primary bg-primary/10" :
                  "border-border text-muted-foreground"}`}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground font-cinzel tracking-widest uppercase mb-6">{STEPS[step]}</p>

        {/* STEP 0: Origin */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-sm mb-6">
              Every mimic begins as one of two forms. Your origin shapes your strengths and weaknesses forever.
            </p>
            {["Minor", "Lesser"].map(type => {
              const s = STARTING_STATS[type];
              const cfg = TIER_CONFIG["Minor"];
              const isSelected = origin === type;
              return (
                <Card
                  key={type}
                  onClick={() => handleOriginSelect(type)}
                  className={`cursor-pointer transition-all border-2 ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-cinzel text-xl text-foreground">{type} Mimic</CardTitle>
                      {isSelected && <Check className="w-5 h-5 text-primary" />}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-cinzel uppercase tracking-wide">Stats</p>
                        <div className="space-y-2">
                          <StatBar label="Plausibility" value={s.plausibility} max={6} color={type === "Minor" ? "bg-green-500" : "bg-orange-400"} />
                          <StatBar label="Adhesion" value={s.adhesion} max={6} />
                          <StatBar label="Patience" value={s.patience} max={6} color={type === "Minor" ? "bg-green-500" : "bg-orange-400"} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-cinzel uppercase tracking-wide">Traits</p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {type === "Minor" ? (
                            <>
                              <li className="flex gap-1"><span className="text-green-400">✓</span> High plausibility — hard to detect</li>
                              <li className="flex gap-1"><span className="text-green-400">✓</span> High patience — easier to wait</li>
                              <li className="flex gap-1"><span className="text-red-400">✗</span> Cannot consume full humanoids</li>
                              <li className="flex gap-1"><span className="text-red-400">✗</span> Lower mass and capacity</li>
                            </>
                          ) : (
                            <>
                              <li className="flex gap-1"><span className="text-green-400">✓</span> Can consume full humanoids</li>
                              <li className="flex gap-1"><span className="text-green-400">✓</span> Higher mass and capacity</li>
                              <li className="flex gap-1"><span className="text-red-400">✗</span> Low plausibility — easier to spot</li>
                              <li className="flex gap-1"><span className="text-red-400">✗</span> Low patience — harder to wait</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground/70 border-t border-border pt-3 flavor-text italic">
                      {type === "Minor"
                        ? "The patient predator. It has waited in dark corners for centuries, perfecting the art of stillness."
                        : "The hungry predator. It sacrificed subtlety for raw hunger — larger, faster to consume, but cruder in its imitation."}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* STEP 1: Name */}
        {step === 1 && (
          <div className="space-y-6 text-center">
            <p className="flavor-text text-muted-foreground">
              You are not yet a thing. But you will need a name — a private hunger-word known only to yourself.
            </p>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your mimic's name..."
              className="text-center text-xl font-cinzel bg-card border-border focus:border-primary h-14 text-foreground"
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground">Adventurers will never know this name. It is yours alone.</p>
          </div>
        )}

        {/* STEP 2: Forms */}
        {step === 2 && (
          <div>
            <p className="text-center text-muted-foreground text-sm mb-2">
              Choose <strong className="text-foreground">2 starting forms</strong>. You may adopt up to 3 forms later as you grow.
            </p>
            <p className="text-center text-xs text-muted-foreground/60 mb-2 flavor-text italic">
              Forms from your tier, plus one tier above or below. Only {MAX_FORMS_ABOVE_TIER} may come from the tier above.
            </p>
            <div className="flex gap-2 justify-center mb-4 text-[10px] text-muted-foreground">
              <span className="px-2 py-0.5 rounded border border-border">Same tier: no penalty</span>
              <span className="px-2 py-0.5 rounded border border-orange-400/30 text-orange-400">Above: –2 Plausibility</span>
              <span className="px-2 py-0.5 rounded border border-yellow-400/30 text-yellow-400">Below: –1 Patience</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableForms.map(form => {
                const isSelected = selectedForms.find(f => f.id === form.id);
                const blockedByAboveRule = !isSelected && !canAddForm(selectedForms, form, startingTier);
                const disabled = !isSelected && (selectedForms.length >= 2 || blockedByAboveRule);
                const formTierIdx = TIER_ORDER.indexOf(form.tier);
                const myTierIdx = TIER_ORDER.indexOf(startingTier);
                const tierDiff = formTierIdx - myTierIdx;
                return (
                  <Card
                    key={form.id}
                    onClick={() => !disabled && toggleForm(form)}
                    className={`cursor-pointer transition-all border-2 ${
                      isSelected ? "border-primary bg-primary/5" :
                      disabled ? "border-border opacity-40 cursor-not-allowed" :
                      "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-cinzel text-foreground">{form.name}</h3>
                          {tierDiff === 1 && <span className="text-[9px] px-1.5 py-0.5 rounded border border-orange-400/30 text-orange-400">–2 Plaus.</span>}
                          {tierDiff === -1 && <span className="text-[9px] px-1.5 py-0.5 rounded border border-yellow-400/30 text-yellow-400">–1 Pat.</span>}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{form.description}</p>
                      {blockedByAboveRule && selectedForms.length < 2 && (
                        <p className="text-[10px] text-orange-400 mb-2">You already chose a form from the tier above.</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5">
                          +{form.baseAllureModifier} Allure
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{form.tier}</Badge>
                        {form.utilityTags.map(t => (
                          <Badge key={t} variant="outline" className="text-[10px] border-border text-muted-foreground">{t}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {selectedForms.length === 2 && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary text-center font-cinzel">
                ✓ {selectedForms.map(f => f.name).join(" & ")} selected
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Appearance */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="text-center text-muted-foreground text-sm mb-1">
                Choose your starting appearance. You can only use materials you have <em>consumed or observed</em>.
              </p>
              <p className="text-center text-xs text-muted-foreground/60 flavor-text italic mb-4">
                As a Minor mimic you start with: Oak, Iron, Cotton.
              </p>
            </div>

            {/* Primary material */}
            <div>
              <p className="text-xs font-cinzel text-muted-foreground uppercase tracking-wide mb-2">Primary Material (required)</p>
              <div className="flex flex-wrap gap-2">
                {STARTING_MATERIALS[origin || "Minor"].map(mat => (
                  <button
                    key={mat}
                    onClick={() => toggleMaterial("primaryMaterials", mat)}
                    className={`px-3 py-1.5 rounded border text-sm transition-all ${
                      appearance.primaryMaterials.includes(mat)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            {/* Surface trait */}
            <div>
              <p className="text-xs font-cinzel text-muted-foreground uppercase tracking-wide mb-2">Surface Trait (optional, max 1)</p>
              <div className="flex flex-wrap gap-2">
                {TRAITS.surface.slice(0, 4).map(trait => (
                  <button
                    key={trait}
                    onClick={() => toggleTrait("surfaceTraits", trait)}
                    className={`px-3 py-1.5 rounded border text-sm transition-all ${
                      (appearance.surfaceTraits || []).includes(trait)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition trait */}
            <div>
              <p className="text-xs font-cinzel text-muted-foreground uppercase tracking-wide mb-2">Condition Trait (optional, max 1)</p>
              <div className="flex flex-wrap gap-2">
                {TRAITS.condition.map(trait => (
                  <button
                    key={trait}
                    onClick={() => toggleTrait("conditionTraits", trait)}
                    className={`px-3 py-1.5 rounded border text-sm transition-all ${
                      (appearance.conditionTraits || []).includes(trait)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>

            {appearance.primaryMaterials.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Select at least a primary material to continue.
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Confirm */}
        {step === 4 && origin && (
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <div className="text-center mb-4">
                  <h2 className="font-cinzel text-2xl text-primary">{name}</h2>
                  <p className="text-muted-foreground text-sm">{origin} Mimic</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Plausibility", value: STARTING_STATS[origin].plausibility },
                    { label: "Adhesion", value: STARTING_STATS[origin].adhesion },
                    { label: "Patience", value: STARTING_STATS[origin].patience },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-3 bg-muted/30 rounded border border-border">
                      <div className="text-2xl font-bold text-foreground">{value}</div>
                      <div className="text-[10px] text-muted-foreground font-cinzel uppercase">{label}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-cinzel uppercase tracking-wide mb-2">Starting Forms</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedForms.map(f => (
                      <Badge key={f.id} className="bg-primary/10 text-primary border-primary/20 border">{f.name}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-cinzel uppercase tracking-wide mb-2">Appearance</p>
                  <p className="text-sm text-foreground">
                    {[...appearance.primaryMaterials, ...appearance.surfaceTraits, ...appearance.conditionTraits].join(", ")}
                  </p>
                </div>
                <div className="flavor-text text-xs text-muted-foreground/70 italic border-t border-border pt-3">
                  {TIER_CONFIG[origin].lore}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="border-border hover:border-primary/50"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="bg-primary text-primary-foreground hover:bg-primary/80"
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={saving || !canProceed()}
              className="bg-primary text-primary-foreground hover:bg-primary/80 font-cinzel"
            >
              {saving ? "Awakening..." : "Begin the Hunt"}
            </Button>
          )}
        </div>
        {saveError && (
          <p className="mt-3 text-sm text-destructive text-right">
            Could not create your mimic: {saveError}
          </p>
        )}
      </div>
    </div>
  );
}