import { ACHIEVEMENTS, BURN_HUNTS, BURN_SUSPICION, ACTION_WARNING, ACTION_LIMIT } from "@/data/gameData";
import { ACHIEVEMENT_STYLES } from "@/components/game/Achievements";
import Collapsible from "./Collapsible";

/** The detailed rules, one panel each. */
export default function MechanicsSection() {
  return (
    <div className="space-y-4">
        <h2 className="font-cinzel text-2xl text-foreground mb-4">Detailed Mechanics</h2>
        <Collapsible title="Stealth Check" defaultOpen>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Triggered when an adventurer enters your room (via Wait wandering or Lure). Roll <span className="text-foreground">Plausibility + Patience/2 d6</span> vs. adventurer's <span className="text-foreground">Discipline + Suspicion d6</span>.</p>
            <p>Modifiers applied before rolling:</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• Form one tier <span className="text-foreground">above</span> you: <span className="text-red-400">–2 Plausibility</span></li>
              <li>• Form one tier <span className="text-foreground">below</span> you: <span className="text-red-400">–1 Patience</span> (fewer bonus dice from Patience)</li>
              <li>• <span className="text-foreground">Room context bonus</span>: e.g. +1 if you're a Barrel in a Cellar</li>
              <li>• <span className="text-foreground">Room context penalty</span>: e.g. –2 if you're a Bookshelf in a Cellar</li>
            </ul>
            <p>Before the main roll, exposed flaws (based on low plausibility) are contested individually. Each adventurer's perception affinities add bonus dice to their flaw checks.</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• Plausibility ≤ 2: 2 flaws exposed</li>
              <li>• Plausibility ≤ 3: 1 flaw exposed</li>
              <li>• Plausibility 4+: No automatic flaws</li>
            </ul>
            <p>A failed stealth check raises suspicion. Detected flaws add further suspicion on top.</p>
          </div>
        </Collapsible>
        <Collapsible title="Allure Check">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Lure rolls <span className="text-foreground">Base Allure + form modifier + room context d6</span> vs. the adventurer's <span className="text-foreground">Discipline + Suspicion/2 d6</span>. Success draws them into your room.</p>
            <p>Your look is compared against what each adventurer is <span className="text-yellow-400">attracted to</span> and <span className="text-red-400">put off by</span>. Materials (primary and secondary, magic or not), surface traits, symbolic traits, condition traits, your form's tags and your form's built-in traits (e.g. a Chest is always Iron-Banded and Heavy-Lidded) all count.</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• Each quality they like: <span className="text-green-400">+1 die</span>, up to your Plausibility. Going over that cap is too good to be true: <span className="text-red-400">+1 suspicion</span>.</li>
              <li>• Each quality they dislike: <span className="text-red-400">–1 die</span>, with no cap. A King won't be tempted by anything Cracked or Dusty.</li>
            </ul>
            <p>When you Strike, you go for the nearest lured adventurer, preferring whoever likes your look most (likes minus dislikes).</p>
          </div>
        </Collapsible>
        <Collapsible title="Room Context Modifiers">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Certain forms gain or lose plausibility and allure based on the room you inhabit. This reflects how natural or out-of-place an object looks in its surroundings. This is exemplified by, but not limited to, the following:</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• <span className="text-foreground">Barrel in a Cellar</span>: +1 Plausibility, +1 Allure</li>
              <li>• <span className="text-foreground">Bookshelf in a Cellar</span>: –2 Plausibility</li>
              <li>• <span className="text-foreground">Bookshelf in Arcane Library</span>: +1 Plausibility, –1 Allure (one of many)</li>
              <li>• <span className="text-foreground">Writing Desk in a Study</span>: +1 Plausibility, +1 Allure</li>
              <li>• <span className="text-foreground">Bed in a Bedroom</span>: +1 Plausibility</li>
              <li>• <span className="text-foreground">Chest in a Vault</span>: +1 Plausibility, +1 Allure</li>
            </ul>
            <p>Room context is shown in the event log when you lure or when adventurers enter your room.</p>
          </div>
        </Collapsible>
        <Collapsible title="Form Tier Penalties">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Taking a form one tier <span className="text-foreground">above</span> your current tier: <span className="text-red-400">–2 Plausibility</span> (not enough mass to fully fill the form)</p>
            <p>Taking a form one tier <span className="text-foreground">below</span> your current tier: <span className="text-red-400">–1 Patience</span> (too much mass in too small a space)</p>
            <p>You may only have <span className="text-foreground">1 greater-tier form</span> in your known forms at once.</p>
            <p><span className="text-purple-400">🪵 Thimblewood</span> shrinks you one tier while worn: every rule above treats you as that smaller size. Forms two tiers below open up (at –1 Patience), forms one tier below lose their penalty, and forms of your own tier count as one above (–2 Plausibility, and the one-form limit). Putting it on or taking it off sends you to choose your forms again.</p>
          </div>
        </Collapsible>
        <Collapsible title="Evolution & Assimilation">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>When you reach the AP threshold for your tier, you may choose to spend AP to:</p>
            <ul className="space-y-1 ml-4">
              <li>• <span className="text-foreground">Increase Mass</span> — move toward the next tier</li>
              <li>• <span className="text-foreground">+1 Plausibility</span> — harder to detect</li>
              <li>• <span className="text-foreground">+1 Adhesion</span> — better at catching prey</li>
              <li>• <span className="text-foreground">+1 Patience</span> — better at waiting</li>
            </ul>
            <p>AP costs for stat upgrades scale with your tier. Evolution costs are fixed per tier.</p>
          </div>
        </Collapsible>
        <Collapsible title="Learning Materials & Traits">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>You can only use materials and traits in your appearance if you have <span className="text-foreground">previously consumed or directly observed</span> them.</p>
            <p>Consuming an adventurer does <span className="text-foreground">not</span> guarantee you learn everything they carry. Assimilation is imperfect — each kill yields a <span className="text-foreground">random subset</span> of their materials and traits. Hunt the same type repeatedly to learn all they have to offer.</p>
            <p>Traits have a lower chance of transfer than materials — they represent deeper knowledge that may require multiple encounters to fully absorb.</p>
            <p>A partial bite that holds has a <span className="text-foreground">35% chance</span> to teach one of the target's materials.</p>
            <p>The number of materials and traits you can apply simultaneously scales with your tier — see the Appearance Limits table.</p>
          </div>
        </Collapsible>
        <Collapsible title="Companions & Familiars">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Some adventurers may arrive with a <span className="text-foreground">companion or familiar</span> — a beast or bound creature that counts as an additional party member.</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• <span className="text-foreground">Rangers</span> have a chance to bring an animal companion: Bear, Hound, or Lynx.</li>
              <li>• <span className="text-foreground">Warlocks</span> may be accompanied by a bound Imp or Felhound.</li>
              <li>• Some elites bring trained beasts of their own: the <span className="text-foreground">Mimic Hunter</span>'s Bloodhound (some are trained in Blood Scent), or the <span className="text-foreground">Orcish Tracker</span>'s War Boar or Warg. They are rarer, but sharper and tougher than ordinary companions.</li>
              <li>• <span className="text-foreground">Fey Changelings</span> are often trailed by a Pixie or Thorn Sprite.</li>
              <li>• <span className="text-foreground">Giant's Goose-Keepers</span> rarely go anywhere without a Giant Goose — or, if you're lucky, the Golden Goose itself. Geese hear everything.</li>
            </ul>
            <p>Companions may wander separately from their owner — they can be lured and consumed independently. They yield AP and count toward party depletion; some, like fey familiars and geese, also carry materials or traits you can learn.</p>
          </div>
        </Collapsible>
        <Collapsible title="Suspicion from Combat">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><span className="text-foreground">Successful consumption</span> raises suspicion by <span className="text-red-400">+1</span> — a party member has gone missing.</p>
            <p><span className="text-foreground">Successful consumption in the presence of others</span> raises suspicion by <span className="text-red-400">+2-3</span> — one or more people may have seen your true form as you ate.</p>
            <p><span className="text-foreground">Failed strike</span> raises suspicion by <span className="text-red-400">+4</span> — the target saw you lunge and knows exactly what you are.</p>
            <p>Partial bites (Minor mimics, or any mimic biting a giant it can't yet swallow) raise suspicion by <span className="text-red-400">+2</span> per hit, and <span className="text-red-400">+3</span> if the target flees.</p>
          </div>
        </Collapsible>
        <Collapsible title="Burned Lairs & Forms">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>When a party discovers you, the survivors talk. The <span className="text-foreground">location</span> and the <span className="text-foreground">form you were caught in</span> are both <span className="text-orange-400">🔥 burned</span> for your next <span className="text-foreground">{BURN_HUNTS} hunts</span>.</p>
            <p>Hunting at a burned location starts you at <span className="text-red-400">+{BURN_SUSPICION} suspicion</span>, and so does starting a hunt in a burned form. They stack: going back to the same place in the same shape starts you at <span className="text-red-400">+{BURN_SUSPICION * 2}</span>. Burned cards are marked on the hunting-ground and form screens. Being discovered again resets the count.</p>
          </div>
        </Collapsible>
        <Collapsible title="Bounty Hunts (Legendary Reputation)">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>At high mass, your notoriety draws specialized hunters specifically targeting <span className="text-foreground">you by name</span>.</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• <span className="text-foreground">Mass 30–35</span>: 25% chance of a Bounty Hunt per expedition</li>
              <li>• <span className="text-foreground">Mass 36+</span>: 50% chance of a Bounty Hunt per expedition</li>
            </ul>
            <p>Bounty hunts spawn an entirely hunter party of mimic specialists — they know your kind intimately. <span className="text-red-400">Suspicion starts at 4</span> because they know you are already there. They are much harder to deceive than ordinary adventurers.</p>
            <p>Hunter types include Gnomish Tinkerer-Hunters (acoustic/material specialists), Draconic Bounty Hunters (environmental/magical), Orcish Trackers (scent-based), and the rare Tiefling Hexblade (Apex only, magical presence expert).</p>
          </div>
        </Collapsible>
        <Collapsible title="Rival Mimic Encounters">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Approximately <span className="text-foreground">1 in every 7 hunts</span> (Greater tier and above), another mimic has moved into your hunting ground. It lurks in a room you have not yet chosen.</p>
            <p>The rival is hidden at first — you will only know something is wrong because <span className="text-foreground">adventurers silently vanish</span> when they wander into its room. The event log will show cryptic messages about party members who do not return.</p>
            <p><span className="text-foreground font-semibold">How to defeat it:</span></p>
            <ol className="space-y-1 ml-4 text-xs list-decimal list-inside">
              <li>Watch the event log for cryptic disappearances — note which room is mentioned.</li>
              <li>Use <span className="text-foreground">Relocate</span> to move into that room. Entering the rival's room reveals it.</li>
              <li>Once revealed, use <span className="text-foreground">Strike!</span> to consume it for a major AP bonus (+12 AP).</li>
              <li>If you miss, the rival retreats and re-hides. Track it again.</li>
            </ol>
            <p>A rival indicator appears in the left panel once you have received a clue.</p>
            <p>If you consume all the adventurers before finding your rival <span className="text-foreground">the hunt will end</span> and you will lose your chance.</p>
          </div>
        </Collapsible>
        <Collapsible title="Low-Mass Plausibility Penalty">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>If your mass drops below your tier's minimum threshold (due to mass decay), your effective Plausibility is reduced. You do not lose your tier, but your deception weakens until you feed enough to restore your mass.</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• Mass below your <span className="text-foreground">current tier's minimum</span>: <span className="text-red-400">–1 Plausibility</span></li>
              <li>• Mass below the <span className="text-foreground">tier below yours</span>: <span className="text-red-400">–2 Plausibility</span></li>
            </ul>
            <p>The red portion of the Plausibility bar in the left panel shows exactly how many points are penalized. Hover over it for details. Hunt and feed to restore your mass and remove the penalty.</p>
          </div>
        </Collapsible>
        <Collapsible title="Mass Decay">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>A mimic that does not feed will slowly lose mass. If you are away from the game for several days without hunting, your mass will diminish upon your return.</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• <span className="text-foreground">1 mass point lost per 3 days</span> without feeding</li>
              <li>• Mass cannot decay below 1</li>
              <li>• A notification banner tells you exactly how much was lost when you return</li>
            </ul>
            <p>Any successful feeding — whether consuming an adventurer, a small creature, or landing a bite — resets the decay timer.</p>
          </div>
        </Collapsible>
        <Collapsible title="Hunt Time Limit (Adventurer Patience)">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Adventurers will not search forever. If you perform <span className="text-foreground">{ACTION_LIMIT} actions</span> (Lure, Wait, Relocate) without landing a Strike, the party grows bored and leaves — ending the hunt.</p>
            <p>A warning appears in the left panel at {ACTION_WARNING} actions remaining, turning red as the limit approaches. Striking any target (adventurer or rival mimic) or consuming a creature resets the counter.</p>
            <p>This prevents frustrating dead-end hunts where remaining adventurers cannot be lured — the hunt simply ends and you move on to fresh prey.</p>
          </div>
        </Collapsible>
        <Collapsible title="Sickness System (Apex — All Stats Capped)">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>When all three of your combat stats (<span className="text-foreground">Plausibility</span>, <span className="text-foreground">Adhesion</span>, and <span className="text-foreground">Patience</span>) are at their maximum of <span className="text-foreground">6</span>, there is a <span className="text-foreground">20% chance</span> at the start of each hunt that your mimic contracts a temporary sickness.</p>
            <p>Sicknesses apply <span className="text-red-400">penalties to one or two stats</span> for the duration of that hunt only — they are cleared when the hunt ends.</p>
            <p>The six possible sicknesses:</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• <span className="text-foreground">Mimic Pox</span> — <span className="text-red-400">–3 Plausibility</span>: blisters ripple across your disguise surface.</li>
              <li>• <span className="text-foreground">Adhesion Palsy</span> — <span className="text-red-400">–3 Adhesion</span>: your gripping enzymes fail to cohere.</li>
              <li>• <span className="text-foreground">Torpor Rot</span> — <span className="text-red-400">–3 Patience</span>: a creeping stillness prevents you holding yourself still.</li>
              <li>• <span className="text-foreground">Surface Decay</span> — <span className="text-red-400">–2 Plausibility, –2 Adhesion</span>: outer membrane degradation.</li>
              <li>• <span className="text-foreground">Mimic Ague</span> — <span className="text-red-400">–2 Plausibility, –2 Patience</span>: feverish shuddering undermines deception and stillness.</li>
              <li>• <span className="text-foreground">Grip Fatigue</span> — <span className="text-red-400">–2 Adhesion, –2 Patience</span>: exhaustion bleeds between muscles and stillness.</li>
            </ul>
            <p>When afflicted, the hunt opens with an amber warning banner naming the sickness. The affected stat bars show an <span className="text-amber-400">orange penalty segment</span> (distinct from the red mass-decay penalty), and hovering reveals the sickness name and details.</p>
          </div>
        </Collapsible>
        <Collapsible title="New Locations & Forms (Apex)">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>High-mass Apex mimics unlock additional locations and forms gated by raw mass rather than just tier:</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• <span className="text-foreground">Ruined City Quarter</span> — unlocks at mass 30</li>
              <li>• <span className="text-foreground">Border Guardhouse</span> — unlocks at mass 33</li>
              <li>• <span className="text-foreground">Abandoned Castle</span> / <span className="text-foreground">Castle Gate form</span> — unlocks at mass 35</li>
              <li>• <span className="text-foreground">Lighthouse form</span> — unlocks at mass 38</li>
            </ul>
          </div>
        </Collapsible>
        <Collapsible title="Rare Locations">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Some hunting grounds aren't always within reach. After each hunt there's a <span className="text-foreground">15% chance</span> that word reaches you of a rare location for which you qualify. It appears on the hunting-ground screen with a <span className="text-amber-400">✦ gold border</span> and stays for <span className="text-foreground">2 hunts elsewhere</span>, or until you hunt there. Only one rare location is open at a time. Rare locations have their own adventurers, and no bounty hunters or rival mimics follow you there.</p>
            <p className="font-semibold text-foreground">The Hollow Reliquary <span className="text-muted-foreground font-normal">(Standard+)</span></p>
            <p>A half-ruined shrine built around a sacred chest that once "consumed the unworthy." The chest is long gone, but pilgrims still come, and some of them have never stopped believing it will return.</p>
            <p className="font-semibold text-foreground">The Mimic Nest <span className="text-muted-foreground font-normal">(Greater+)</span></p>
            <p>A dockside warehouse where your kind has nested: 3–4 rival mimics hide in its rooms, and one of them is the <span className="text-foreground">Elder Mimic</span> (5 dice to resist, 18 AP). Younger nest mimics are easier prey (3 dice, 6 AP). The few adventurers sent to investigate are your best guides — whatever eats them is hiding where they vanished. <span className="text-foreground">Devouring the Elder ends the hunt</span>; running out of adventurers does not.</p>
            <p className="font-semibold text-foreground">The Sinking Ship <span className="text-muted-foreground font-normal">(Lesser+)</span></p>
            <p>A merchant ship holed on the rocks. It goes under after <span className="text-foreground">15 turns</span> (every Wait, Lure, Relocate and Strike counts), and whoever is left takes to the lifeboats. The <span className="text-foreground">Ship's Captain</span> is always aboard, clutching the strongbox: swallow the Captain whole and the strongbox goes down too, for <span className="text-foreground">+8 AP</span> on top of the usual reward and one guaranteed new material or trait from its contents (Gold, Silver, Crystal, Heraldic Crest or Guild Mark).</p>
          </div>
        </Collapsible>
        <Collapsible title="Giant Realm (Apex — Mass 28+)">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>At high Apex mass, two entirely new hunting grounds become available — locations scaled for giant-sized prey, with their own exclusive adventurer pool, materials, and forms.</p>
            <p className="font-semibold text-foreground">Giant's Castle <span className="text-muted-foreground font-normal">(Apex, mass 28+)</span></p>
            <p>A castle whose ceilings brush the clouds. Rooms include the Great Hall, Giant's Kitchen, Treasury Vault, Goose Chamber, Sleeping Quarters, and Cloud Battlement. Parties are small (2–4) but extremely powerful. Its giants are the Half-Giant Mercenary, Giant-Blood Shaman, Giant's Goose-Keeper, Giant Treasure Hoarder and Beanstalk Climber. Local creatures include Cloud Goslings, Giant Rats, and the Giant's Cat.</p>
            <p className="font-semibold text-foreground">Cloud Kingdom Outpost <span className="text-muted-foreground font-normal">(Apex, mass 38+)</span></p>
            <p>A floating fortress of cloud-stone and stormforged iron, reachable only by beanstalk or sorcery. No ordinary adventurers make the climb: parties are tiny (2–3) and drawn only from its five resident giants — the Giant Lord, Cloud Forge Smith, Cloud Eagle Rider, Cloud Giant Scout and Storm Giant Wanderer. Storm Elementals, Cloud Eagles and Cloud Goslings drift through its halls. The highest-risk, highest-reward location in the game.</p>
            <p><span className="text-amber-400 font-semibold">🍖 Titanic Feast:</span> consume all five Cloud Kingdom giants <span className="text-foreground">whole</span> — finishing one off with bites doesn't count.</p>
            <p className="font-semibold text-foreground mt-2">Giant-realm materials</p>
            <p>Giant-kin carry exclusive materials: <span className="text-amber-400">Titan Oak, Giant Iron, Sky Gold, Lightning Marble, Cumulogranite, Beanstalk Timber, Beanstalk Leather, Cloud Fleece, Golden Goose Down, Stormforged Iron</span>. These can only be obtained in these locations.</p>
            <p className="font-semibold text-foreground mt-2">Giant forms</p>
            <p>Giant forms are mass-gated Apex forms designed to be plausible in giant-scaled environments. Using a standard Minor/Lesser form (e.g. a normal Pillow) in the Giant's Castle would look absurdly small — Giant Forms resolve this. They require higher digestive capacity and have more material slots.</p>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• <span className="text-foreground">Giant Pillow, Giant Goblet, Giant Barrel</span> — mass 28+</li>
              <li>• <span className="text-foreground">Giant Chest, Giant Tome</span> — mass 30+</li>
              <li>• <span className="text-foreground">Giant Throne, Giant Bed</span> — mass 33–35+</li>
            </ul>
            <p>Giant-kin adventurers yield <span className="text-foreground font-semibold">12 AP</span> when consumed — roughly double to triple normal adventurer rewards.</p>
            <p className="font-semibold text-foreground mt-2">Too big to swallow</p>
            <p>Each giant can only be swallowed whole once your mass reaches its <span className="text-foreground">"Consumed whole at"</span> value on its Codex entry (e.g. a Half-Giant Mercenary at mass 36, the Giant Lord at 52). Until then you take <span className="text-foreground">partial bites</span>, like a Minor mimic: each bite that holds is worth <span className="text-foreground">2–3 AP</span> and may teach one of the giant's materials, and a giant worn down by enough bites collapses for a final <span className="text-foreground">+2 AP</span>.</p>
          </div>
        </Collapsible>
        <Collapsible title="Achievements">
          <div className="text-sm text-muted-foreground space-y-2">
            {ACHIEVEMENTS.map(a => (
              <p key={a.id}><span className={`${ACHIEVEMENT_STYLES[a.id].text} font-semibold`}>{a.icon} {a.name}:</span> {a.description}</p>
            ))}
            <p>Earned achievements appear as badges beside your mimic on the home screen.</p>
          </div>
        </Collapsible>
      </div>
  );
}
