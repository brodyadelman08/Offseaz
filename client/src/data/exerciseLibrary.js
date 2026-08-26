/**
 * Exercise description library — keys are lowercase exercise names.
 * Each entry: { description: string, muscles: string }
 */
const EXERCISE_LIBRARY = {
  // ─── Common compound lifts ────────────────────────────────────────────────
  'back squat': {
    description: 'Bar on traps, feet shoulder-width. Brace core, sit back and down until thighs are parallel to the floor, then drive up through your heels.',
    muscles: 'Quads, glutes, hamstrings, core',
  },
  'squat': {
    description: 'Bar on traps, feet shoulder-width. Brace core, sit back and down until thighs are parallel to the floor, then drive up through your heels.',
    muscles: 'Quads, glutes, hamstrings, core',
  },
  'front squat': {
    description: 'Bar rests on front delts with elbows high. Keep torso upright as you squat to parallel, then drive up through your heels.',
    muscles: 'Quads, upper back, core',
  },
  'cross-arm front squat': {
    description: 'Same front squat setup, but cross your arms over the bar (right hand on left shoulder, left hand on right shoulder) instead of a full front-rack grip — takes the load off your wrists entirely. Keep torso upright as you squat to parallel, then drive up through your heels.',
    muscles: 'Quads, upper back, core',
  },
  'box squat': {
    description: 'Bar on traps, feet shoulder-width, box set to just below parallel. Sit back and down under control until you touch the box, pause briefly, then drive up through your heels.',
    muscles: 'Quads, glutes, hamstrings, core',
  },
  'leg press': {
    description: 'Seated in the leg press machine, feet shoulder-width on the platform. Lower the platform under control until your knees reach about 90°, then press back up without locking out hard.',
    muscles: 'Quads, glutes, hamstrings',
  },
  'single leg press': {
    description: 'Same setup as the leg press machine, one foot on the platform at a time. Lower under control to about 90° of knee bend, then press back up without locking out hard.',
    muscles: 'Quads, glutes, hamstrings',
  },
  'front split squat': {
    description: 'From a split stance, lower your rear knee toward the floor while keeping your front shin vertical, then drive back up through your front heel.',
    muscles: 'Quads, glutes, hip flexors',
  },
  'bulgarian split squat': {
    description: 'Rear foot elevated on a bench, front foot forward. Lower your rear knee toward the floor, keeping your torso upright, then drive up through your front heel.',
    muscles: 'Quads, glutes, hip flexors',
  },
  'bulgarian split squat iso hold': {
    description: 'Rear foot elevated on a bench, front foot forward. Lower into the bottom position and hold it, front thigh parallel to the floor, torso upright — a static hold, no reps.',
    muscles: 'Quads, glutes, hip flexors',
  },
  'bench press': {
    description: 'Lie on a flat bench, grip just outside shoulder-width. Lower the bar to your chest under control, then press back to lockout.',
    muscles: 'Chest, anterior deltoids, triceps',
  },
  'db bench press': {
    description: 'Lying on a flat bench, lower dumbbells to chest level with elbows at ~45°, then press up until arms are fully extended.',
    muscles: 'Chest, anterior deltoids, triceps',
  },
  'db incline bench press': {
    description: 'Set bench to 30–45°. Lower dumbbells to upper chest with elbows at ~45°, then press up to full arm extension.',
    muscles: 'Upper chest, anterior deltoids, triceps',
  },
  'incline db press': {
    description: 'Set bench to 30–45°. Lower dumbbells to upper chest with elbows at ~45°, then press up to full arm extension.',
    muscles: 'Upper chest, anterior deltoids, triceps',
  },
  'close grip bench press': {
    description: 'Grip the bar about shoulder-width. Lower to your lower chest, keeping elbows tucked close to your sides, then press to lockout.',
    muscles: 'Triceps, chest, anterior deltoids',
  },
  'trap bar deadlift': {
    description: 'Stand inside the hex bar, hinge to grab the handles, brace your core, and push the floor away as you drive your hips to standing.',
    muscles: 'Quads, glutes, hamstrings, erectors',
  },
  'trap bar jump': {
    description: 'Stand inside the hex/trap bar and pick it up to a standing hinge position. Explosively triple-extend (hips, knees, ankles) into a vertical jump, then land softly and reset. A safe, unsupervised-friendly alternative to Olympic-lift catch variations — same explosive triple extension, no technical catch phase. Keep the load light (suggested: under 155lbs) so the movement stays fast and jump-like, not a max-effort pull.',
    muscles: 'Glutes, hamstrings, quads, calves (triple extension/power)',
  },
  'hex bar deadlift': {
    description: 'Stand inside the hex bar, hinge to grab the handles, brace your core, and push the floor away as you drive your hips to standing.',
    muscles: 'Quads, glutes, hamstrings, erectors',
  },
  'rdl': {
    description: 'Stand tall, soft bend in knees. Hinge at the hips, pushing them back as you lower the bar down your legs until you feel a hamstring stretch, then drive hips forward to return.',
    muscles: 'Hamstrings, glutes, erectors',
  },
  'romanian deadlift': {
    description: 'Stand tall, soft bend in knees. Hinge at the hips, pushing them back as you lower the bar down your legs until you feel a hamstring stretch, then drive hips forward to return.',
    muscles: 'Hamstrings, glutes, erectors',
  },
  'good mornings': {
    description: 'Bar on your traps, soft bend in the knees. Hinge at the hips, lowering your torso toward parallel while keeping your back flat, then drive your hips forward to return.',
    muscles: 'Hamstrings, glutes, erectors',
  },
  'overhead press': {
    description: 'Bar at collarbone, brace your core, and press straight overhead to full lockout, squeezing your glutes at the top.',
    muscles: 'Anterior/medial deltoids, triceps, upper traps',
  },
  'push press': {
    description: 'Dip slightly at the knees, then explosively extend your legs as you press the bar overhead, using leg drive to initiate the lift.',
    muscles: 'Deltoids, triceps, quads, glutes',
  },
  'pull-ups': {
    description: 'Hang from bar with overhand grip, brace your core, and pull your chin above the bar by driving your elbows down to your sides.',
    muscles: 'Lats, biceps, rear deltoids, core',
  },
  'weighted pull-ups': {
    description: 'Attach weight via belt or hold a dumbbell between your feet. Pull your chin above the bar by driving your elbows down to your sides.',
    muscles: 'Lats, biceps, rear deltoids, core',
  },
  'chin-ups': {
    description: 'Hang from bar with underhand grip, brace your core, and pull your chin above the bar by driving your elbows back.',
    muscles: 'Lats, biceps, brachialis',
  },
  'weighted chin-ups': {
    description: 'Attach weight via belt or hold a dumbbell between your feet. Pull your chin above the bar with an underhand grip.',
    muscles: 'Lats, biceps, brachialis',
  },
  'bb row': {
    description: 'Hinge at hips to about 45°, brace your core, and row the bar to your lower chest by driving your elbows back.',
    muscles: 'Lats, rhomboids, rear deltoids, biceps',
  },
  'barbell row': {
    description: 'Hinge at hips to about 45°, brace your core, and row the bar to your lower chest by driving your elbows back.',
    muscles: 'Lats, rhomboids, rear deltoids, biceps',
  },
  'bent over bb row': {
    description: 'Hinge at hips to about 45°, brace your core, and row the bar to your lower chest by driving your elbows back.',
    muscles: 'Lats, rhomboids, rear deltoids, biceps',
  },
  'single arm db row': {
    description: 'Support yourself with one hand on a bench. Hold a dumbbell and row it to your hip by driving your elbow straight back, keeping your torso stable.',
    muscles: 'Lats, rhomboids, rear deltoids, biceps',
  },
  'db row': {
    description: 'Hinge at hips, hold dumbbells, and row to your hips by driving your elbows straight back.',
    muscles: 'Lats, rhomboids, rear deltoids, biceps',
  },
  'chest supported row': {
    description: 'Chest braced against an incline bench, row dumbbells or a bar straight up to your ribs by driving your elbows back, keeping your torso still.',
    muscles: 'Lats, rhomboids, rear deltoids, biceps',
  },
  'power clean': {
    description: 'From the floor, explosively extend your hips and shrug, then pull yourself under the bar and catch it on your front delts in a quarter-squat position.',
    muscles: 'Posterior chain, traps, core, quads',
  },
  'power clean from floor': {
    description: 'From the floor, explosively extend your hips and shrug, then pull yourself under the bar and catch it on your front delts in a quarter-squat position.',
    muscles: 'Posterior chain, traps, core, quads',
  },
  'hang clean': {
    description: 'Start with the bar at mid-thigh. Dip slightly, then explosively extend your hips and shrug as you pull yourself under to catch on your front delts.',
    muscles: 'Posterior chain, traps, core',
  },
  'hip thrust': {
    description: 'Upper back on a bench, bar across your hips. Drive through your heels to extend your hips fully, squeezing your glutes at the top.',
    muscles: 'Glutes, hamstrings',
  },
  'weighted hip thrust': {
    description: 'Upper back on a bench, bar or dumbbell across your hips. Drive through your heels to extend your hips fully, squeezing your glutes at the top.',
    muscles: 'Glutes, hamstrings',
  },

  // ─── Soccer-specific exercises ────────────────────────────────────────────
  'nordic hamstring curl': {
    description: 'Kneel with your feet anchored. Keeping your hips extended, slowly lower your torso toward the floor using only your hamstrings, then use your hands to push back up and pull yourself back with your hamstrings.',
    muscles: 'Hamstrings (eccentric focus)',
  },
  'hex bar jumps': {
    description: 'Stand inside a hex bar loaded with moderate weight. Perform an explosive countermovement jump, leaving the ground while holding the handles, then land softly and reset.',
    muscles: 'Quads, glutes, hamstrings, calves',
  },
  'groin plank': {
    description: 'Get into a side plank position with your top foot resting in front of the bottom foot. Lower your hips toward the floor then drive them up, targeting the groin of your bottom leg.',
    muscles: 'Hip adductors (groin), obliques, glutes',
  },
  'banded fire hydrant': {
    description: 'Place a resistance band above your knees. On all fours, lift one knee out to the side like a dog at a fire hydrant, keeping your hips square to the floor.',
    muscles: 'Glute medius, hip abductors',
  },
  'lunge hold rainbows': {
    description: 'Hold a split squat/lunge position isometrically. From this stance, arc one arm from low to high in a rainbow motion across your body, alternating sides while keeping your lower body completely still.',
    muscles: 'Hip flexors, quads, core stability, shoulders',
  },
  'mb twist throw': {
    description: 'Stand sideways to a wall or partner. Hold a medicine ball at hip level, rotate away to load, then explosively rotate and release the ball, catching on the rebound.',
    muscles: 'Obliques, rotator cuff, core, hips',
  },
  'kneeling single arm lat pulldown': {
    description: 'Kneel at a cable machine, grab the handle with one hand. Pull it down to your hip by driving your elbow toward your hip pocket, keeping your torso upright.',
    muscles: 'Lats, biceps, core stability',
  },
  'banded monster walk': {
    description: 'Place a resistance band around your ankles or just above your knees. Maintain a slight squat position and take controlled side-steps, keeping tension on the band at all times.',
    muscles: 'Glute medius, hip abductors',
  },
  'lateral squat jump': {
    description: 'From a squat position, load and then jump laterally, landing softly in a squat on the other side. Alternate directions each rep.',
    muscles: 'Quads, glutes, hip abductors',
  },
  'single leg lateral hurdle hop': {
    description: 'Stand on one leg. Hop laterally over a hurdle or cone, absorb the landing on the same leg, stabilize, then hop back. Emphasize a quick, stiff landing.',
    muscles: 'Glutes, quads, peroneals, ankle stabilizers',
  },
  'lateral hurdle hops': {
    description: 'Stand beside a low hurdle with both feet together. Hop laterally over it, landing softly on both feet, then immediately hop back the other way. Keep ground contact time minimal.',
    muscles: 'Glutes, quads, hip abductors, ankle stabilizers',
  },
  'db lateral lunge': {
    description: 'Hold dumbbells at your sides. Step one foot wide to the side, sit your hips back and down over that foot, keeping the opposite leg straight, then push back to standing.',
    muscles: 'Quads, glutes, hip adductors',
  },
  'standing single arm cable row': {
    description: 'Stand facing a cable machine, hold one handle. Pull the handle to your hip, rotating slightly through the torso, while keeping your hips stable.',
    muscles: 'Lats, rhomboids, rear deltoids, obliques',
  },
  'acceleration sprints': {
    description: 'Sprint at maximum effort from a standing or 3-point start, focusing on driving out low and building speed over the prescribed distance.',
    muscles: 'Hip flexors, quads, hamstrings, glutes, calves',
  },
  'flying 20s': {
    description: 'Sprint through 10–20 yards of build-up, reach full speed, then hit the timing gate and hold maximum velocity for 20 yards. Focus on top-end speed mechanics, not acceleration.',
    muscles: 'Hip flexors, quads, hamstrings, glutes',
  },
  'v drill': {
    description: 'Set three cones in a V shape. Sprint to the middle cone, backpedal to start, then sprint out to each far cone, emphasizing sharp change-of-direction cuts.',
    muscles: 'Quads, glutes, hip abductors, calf complex',
  },
  'star drill': {
    description: 'Set cones in a star pattern. From the center, sprint to each outer cone and return to center, working all directions — forward, backward, and lateral.',
    muscles: 'Quads, glutes, hip abductors, hamstrings',
  },
  '300 yard shuttle': {
    description: 'Run 25 yards, touch, return, repeat 6 times totaling 300 yards. This is a standard football/soccer conditioning test of lactate threshold.',
    muscles: 'Full lower body, cardiovascular system',
  },

  // ─── Basketball-specific ──────────────────────────────────────────────────
  'kb rhythmic split drop': {
    description: 'Hold a kettlebell in one hand, stand in a split stance. Rapidly drop your rear knee toward the floor and pop back up in a rhythmic, elastic fashion — no pause at the bottom.',
    muscles: 'Quads, hip flexors, reactive ankle complex',
  },
  'depth jumps': {
    description: 'Step off a box (not jump), land briefly on both feet, then immediately explode into a maximum vertical jump. Minimize ground contact time.',
    muscles: 'Quads, glutes, calves (plyometric)',
  },
  'depth jump → box jump': {
    description: 'A contrast combo: step off a box and immediately explode into a maximum vertical jump onto a second box the moment you land, minimizing ground contact time between the two.',
    muscles: 'Quads, glutes, calves (plyometric, reactive strength)',
  },
  'box jumps': {
    description: 'Stand facing a box. Swing your arms back, hinge slightly, then explosively jump onto the box, landing softly in a quarter-squat. Step down between reps.',
    muscles: 'Quads, glutes, calves',
  },
  'broad jumps': {
    description: 'From a standing position, swing your arms and jump as far forward as possible, landing softly on both feet in a balanced squat.',
    muscles: 'Quads, glutes, hamstrings, calves',
  },
  'single leg box jump': {
    description: 'Balance on one leg, then jump onto a box, landing with control on that same leg. Step down and reset before the next rep.',
    muscles: 'Quads, glutes, ankle stabilizers',
  },
  'lateral step-ups': {
    description: 'Stand sideways next to a box. Step the near foot up, drive through that heel to fully extend, then lower the trailing foot back down with control.',
    muscles: 'Quads, glutes, hip abductors',
  },
  'ankle hops': {
    description: 'Feet together, bounce rapidly from foot to foot using only your ankle complex — knees stay nearly straight. Focus on fast, springy ground contacts.',
    muscles: 'Calves, Achilles complex',
  },
  'approach jump': {
    description: 'Take a 3–4 step running approach and jump as high as possible off one or both feet, mimicking a volleyball or basketball take-off. Focus on converting horizontal speed into vertical power.',
    muscles: 'Quads, glutes, calves',
  },

  // ─── Football-specific ────────────────────────────────────────────────────
  'goblet lateral lunge': {
    description: 'Hold a dumbbell or kettlebell at your chest. Step one foot wide to the side, sit your hips back over that foot, then push back to center.',
    muscles: 'Quads, glutes, hip adductors',
  },
  'db squat jumps': {
    description: 'Hold dumbbells at your sides, squat down to about parallel, then explode up into a jump. Land softly and go directly into the next rep.',
    muscles: 'Quads, glutes, calves',
  },
  'lateral bounds': {
    description: 'Push off one leg to bound laterally, landing on the opposite leg. Stick the landing for a moment, then bound back. Emphasize sticking each landing with control.',
    muscles: 'Glutes, hip abductors, quads, ankle stabilizers',
  },
  'bb split jerk': {
    description: 'Dip slightly at the knees, then drive the bar overhead while splitting your feet front-to-back, locking out your arms. Recover by bringing feet together.',
    muscles: 'Deltoids, triceps, quads, core',
  },
  'db shrugs': {
    description: 'Hold dumbbells at your sides. Elevate your shoulders directly upward as high as possible, hold for a second, then lower with control.',
    muscles: 'Upper traps',
  },
  'sled push': {
    description: 'Place hands on the sled handles, lean into the sled, and drive it forward with powerful alternating leg pushes while maintaining a low body angle.',
    muscles: 'Quads, glutes, calves, pushing muscles',
  },
  'sled sprint': {
    description: 'Attach a harness to a sled. Accelerate forward dragging the sled, maintaining forward lean and high knees.',
    muscles: 'Quads, glutes, hip flexors, calves',
  },
  'easy strides': {
    description: 'Relaxed, controlled accelerations at a comfortable effort — not max speed — used to keep the legs sharp without adding fatigue on top of running training.',
    muscles: 'Full lower body, cardiovascular system',
  },
  'strides': {
    description: 'Short, controlled accelerations building smoothly toward a fast but not max-effort speed, focusing on relaxed, efficient running form.',
    muscles: 'Full lower body, cardiovascular system',
  },
  'aerobic flush': {
    description: 'An easy, conversational-pace jog used as light aerobic work on a lifting day — not a conditioning workout, just enough to keep the aerobic system ticking over.',
    muscles: 'Cardiovascular system',
  },
  'controlled tempo': {
    description: 'A sustained effort at a comfortably hard, conversational pace — not a max-effort interval — used to build aerobic capacity without adding heavy fatigue.',
    muscles: 'Cardiovascular system, full lower body',
  },
  'box jump': {
    description: 'Stand facing a box. Swing your arms back, hinge slightly, then explosively jump onto the box, landing softly in a quarter-squat. Step down between reps.',
    muscles: 'Quads, glutes, calves',
  },
  'hurdle hops': {
    description: 'Jump over a series of low hurdles in succession, landing briefly and re-jumping as quickly as possible. Keep ground contact time minimal.',
    muscles: 'Quads, glutes, calves (plyometric)',
  },
  'med ball chest pass': {
    description: 'Stand facing a wall or partner. Push the ball explosively from your chest like a basketball chest pass, catch the rebound and repeat.',
    muscles: 'Chest, triceps, core',
  },
  'med ball rotational throw': {
    description: 'Stand sideways to a wall. Rotate away from the wall to load, then explosively rotate and throw the ball into the wall, catching on the rebound.',
    muscles: 'Obliques, core, hips, shoulders',
  },
  'med ball slam': {
    description: 'Hold a med ball overhead, then slam it explosively into the floor as hard as possible, bending your knees as you follow through.',
    muscles: 'Lats, core, shoulders, hip flexors',
  },
  'med ball side throw': {
    description: 'Stand perpendicular to a wall, hold the ball at your hip, rotate away, then explosively rotate through and release the ball into the wall.',
    muscles: 'Obliques, hips, shoulders',
  },
  'med ball overhead slam': {
    description: 'Hold a med ball overhead, then slam it explosively into the floor as hard as possible, bending your knees as you follow through.',
    muscles: 'Lats, core, shoulders, hip flexors',
  },
  'cable/band rotational chop': {
    description: 'Set a cable or band high, hold it with both hands, and pull it down and across your body in a chopping motion, rotating your torso and hips together.',
    muscles: 'Obliques, core, shoulders',
  },
  'band pull-aparts': {
    description: 'Hold a band at shoulder height with both hands in front of you. Pull the band apart, drawing your hands apart until the band touches your chest, then slowly return.',
    muscles: 'Rear deltoids, rhomboids, rotator cuff',
  },
  'banded pull-aparts': {
    description: 'Hold a band at shoulder height with both hands in front of you. Pull the band apart, drawing your hands apart until the band touches your chest, then slowly return.',
    muscles: 'Rear deltoids, rhomboids, rotator cuff',
  },
  'face pulls': {
    description: 'At a cable machine with a rope attachment at head height, pull the rope toward your face by flaring your elbows up and out, finishing with your hands beside your ears.',
    muscles: 'Rear deltoids, rhomboids, rotator cuff',
  },
  'ytw series': {
    description: 'Lie face-down on a bench or stand bent over. Perform Y, T, and W raises with light dumbbells — each letter describes the arm position at the top.',
    muscles: 'Rear deltoids, rhomboids, lower traps',
  },
  'ytw shoulder series': {
    description: 'Lie face-down on a bench or stand bent over. Perform Y, T, and W raises with light dumbbells — each letter describes the arm position at the top.',
    muscles: 'Rear deltoids, rhomboids, lower traps',
  },
  'ytw raises': {
    description: 'Lie face-down on an incline bench. Raise light dumbbells through the Y, T, and W arm positions in sequence, squeezing your shoulder blades at the top of each.',
    muscles: 'Rear deltoids, rhomboids, lower traps',
  },
  'scap push-ups': {
    description: 'From a push-up plank position with arms locked, let your shoulder blades pinch together as your chest drops slightly, then push the floor away, protracting your shoulder blades. Elbows stay straight throughout.',
    muscles: 'Serratus anterior, scapular stabilizers',
  },
  'crossover symmetry band series': {
    description: 'Using the Crossover Symmetry band station, run through the full prescribed series (typically external rotation, low row, and elevation patterns) at light resistance and controlled tempo.',
    muscles: 'Rotator cuff, scapular stabilizers, rear deltoids',
  },
  'prone swimmers': {
    description: 'Lie face-down with arms extended overhead. Sweep your arms out and down to your sides like a swimming stroke, squeezing your shoulder blades together, then reverse back overhead.',
    muscles: 'Rear deltoids, rhomboids, lower traps, lats',
  },
  'landmine press': {
    description: 'Anchor a barbell in a corner or landmine attachment. Hold the end with one hand at shoulder height and press it forward-overhead in an arcing path.',
    muscles: 'Anterior deltoids, upper chest, triceps',
  },
  'landmine rotation': {
    description: 'Anchor a barbell. Hold the end with both hands at waist level and arc it from side to side in a controlled rotation, keeping arms extended.',
    muscles: 'Obliques, core, shoulders',
  },
  'band external rotation': {
    description: 'Elbow at your side, bent 90°. Hold a band and rotate your forearm outward away from your body, then slowly return. Keep your elbow pinned to your side.',
    muscles: 'Infraspinatus, teres minor (external rotators)',
  },
  'rotate and press': {
    description: 'Hold a dumbbell or cable handle at shoulder height. Rotate your torso slightly away, then rotate back and press the weight forward simultaneously.',
    muscles: 'Core, anterior deltoid, chest',
  },
  'tricep pushdowns': {
    description: 'At a cable machine with a bar or rope attachment, pin your elbows at your sides and extend your forearms down to full lockout, then return with control.',
    muscles: 'Triceps',
  },
  'tricep extensions': {
    description: 'Hold a dumbbell or cable overhead with arms extended. Bend at the elbows, lowering the weight behind your head, then extend back to lockout.',
    muscles: 'Triceps',
  },
  'triceps': {
    description: 'Any isolation movement (pushdowns, extensions, kickbacks) targeting the triceps. Control the eccentric to maximize muscle tension.',
    muscles: 'Triceps',
  },
  'lat raises': {
    description: 'Hold dumbbells at your sides with a slight forward lean and bent elbows. Raise your arms out to the side to shoulder height, then lower with control.',
    muscles: 'Medial deltoids',
  },
  'lateral raise': {
    description: 'Hold dumbbells at your sides with a slight forward lean and bent elbows. Raise your arms out to the side to shoulder height, then lower with control.',
    muscles: 'Medial deltoids',
  },
  'front raise': {
    description: 'Hold dumbbells in front of your thighs. Keeping a slight bend in your elbows, raise the weights straight out in front to shoulder height, then lower with control.',
    muscles: 'Anterior deltoids',
  },
  'cuban press': {
    description: 'Hold dumbbells at your sides, elbows bent 90°. Raise elbows to shoulder height, externally rotate the weights up, then press overhead to lockout before reversing.',
    muscles: 'Rotator cuff, medial deltoids, triceps',
  },
  'arnold press': {
    description: 'Hold dumbbells at shoulder height with palms facing you. Press overhead while rotating your palms to face forward, reversing the rotation on the way down.',
    muscles: 'Deltoids (all three heads), triceps',
  },
  'lat raises — side, front, back': {
    description: 'Perform three variations back-to-back: lateral raises, front raises, and rear delt raises (bent over), for a complete shoulder circuit.',
    muscles: 'All three deltoid heads',
  },
  'bicep curls': {
    description: 'Hold dumbbells or a barbell at your sides with palms facing forward. Curl up to your shoulders, keeping your elbows pinned, then lower with control.',
    muscles: 'Biceps, brachialis',
  },
  'bench curls': {
    description: 'Sit at the end of a bench with your elbow on your inner thigh for support. Curl a dumbbell from full extension to full flexion.',
    muscles: 'Biceps, brachialis',
  },
  'forearm curls (both ways)': {
    description: 'Perform wrist curls with palms up (flexors) and then wrist extensions with palms down (extensors), using a light barbell or dumbbell with your forearms on your thighs.',
    muscles: 'Wrist flexors and extensors, forearm complex',
  },
  'db chest press (varied grip)': {
    description: 'Perform DB bench press alternating among a neutral grip (palms facing each other), semi-supinated, and overhand grip within the set.',
    muscles: 'Chest, anterior deltoids, triceps',
  },

  // ─── Wrestling-specific ───────────────────────────────────────────────────
  'neck strengthening': {
    description: 'Using a neck harness or manual resistance, perform flexion, extension, and lateral flexion movements through a full range of motion.',
    muscles: 'Sternocleidomastoid, splenius, suboccipitals',
  },
  'grip work': {
    description: 'Hang from a pull-up bar or squeeze a thick implement (towel, fat grip) for timed holds to develop crushing and supporting grip strength.',
    muscles: 'Forearms, finger flexors',
  },
  'rope climb': {
    description: 'Climb a suspended rope hand-over-hand using an L-sit or straight-leg technique, controlling the descent rather than sliding down.',
    muscles: 'Forearms, lats, biceps, core',
  },
  'scrum drive': {
    description: 'In a low, squared scrum stance, drive a sled or scrum machine forward over a set distance, keeping the back flat and hips low throughout.',
    muscles: 'Quads, glutes, hip flexors, upper back',
  },
  'sprawl drills': {
    description: 'From a standing position, shoot your legs back explosively into a wide base position (sprawl), dropping your hips to the mat. Drive back to standing quickly.',
    muscles: 'Hip flexors, quads, core, shoulder girdle',
  },
  'level change explosive sprawl': {
    description: 'Combine a rapid level change (dip) as if defending a shot, then immediately sprawl your legs back and reset explosively.',
    muscles: 'Quads, hip flexors, core',
  },
  'isometric squat hold': {
    description: 'Lower to a parallel squat position and hold without moving, bracing as hard as possible. Develop static strength and durability in the bottom position.',
    muscles: 'Quads, glutes, hamstrings, core',
  },
  'isometric pull hold': {
    description: 'At the top of a pull-up or row position, hold isometrically for the prescribed time, keeping your scapulae retracted and depressed.',
    muscles: 'Lats, biceps, rear deltoids',
  },
  'weighted carries': {
    description: 'Carry heavy implements (farmer — dumbbells at sides; suitcase — one side only; rack — dumbbells at shoulder height) for distance, maintaining upright posture.',
    muscles: 'Traps, core, forearms, legs',
  },
  'farmer / suitcase / rack': {
    description: 'Three carry variations: farmer (bilateral at sides), suitcase (one side only), and rack (held at shoulder height). Each challenges grip and core stability differently.',
    muscles: 'Traps, core, forearms, legs',
  },

  // ─── Volleyball-specific ──────────────────────────────────────────────────
  'copenhagen adductor': {
    description: 'Lie sideways with your top ankle or lower leg resting on a box or bench. Raise your bottom leg up to meet the bench, then lower with control.',
    muscles: 'Hip adductors (groin)',
  },
  'hip abduction': {
    description: 'Use a cable or band at your ankle to raise your leg out to the side against resistance, then slowly return. Keep your torso stable throughout.',
    muscles: 'Glute medius, tensor fasciae latae',
  },

  // ─── Baseball-specific ────────────────────────────────────────────────────
  'bird dog row': {
    description: 'Start on all fours with one leg extended behind you. Hold a dumbbell in the opposite hand and row it to your hip, maintaining a flat back and stable hips.',
    muscles: 'Lats, rhomboids, erectors, glutes, core',
  },
  'ext/int rotation': {
    description: 'Using a cable or band at elbow height, perform both external rotation (rotating forearm outward) and internal rotation (rotating forearm inward) for shoulder health.',
    muscles: 'Rotator cuff (infraspinatus, subscapularis)',
  },
  'core — cherry pickers': {
    description: 'Lie on your back with legs extended slightly off the floor. Alternate reaching one arm overhead and the opposite arm by your hip in a diagonal pattern.',
    muscles: 'Core, obliques, hip flexors',
  },
  'core — tuck-up': {
    description: 'Lie on your back with arms overhead and legs extended. Simultaneously crunch your knees to your chest while reaching your arms forward to meet your knees.',
    muscles: 'Rectus abdominis, hip flexors',
  },
  'core — bird dogs': {
    description: 'On all fours, simultaneously extend your right arm forward and left leg back, hold briefly, then switch sides.',
    muscles: 'Erectors, core, glutes',
  },
  'core — ext/int rotation': {
    description: 'Using a cable or band, perform rotational movements both external and internal to develop rotational core strength and shoulder health.',
    muscles: 'Obliques, rotator cuff',
  },
  'box drop': {
    description: 'Stand on a box and step off to drop onto both feet simultaneously, absorbing the landing softly into a quarter squat to train landing mechanics.',
    muscles: 'Quads, calves, ankle stabilizers',
  },
  'hamstring curls': {
    description: 'Using a leg curl machine (lying or seated), curl your lower legs toward your hips against resistance, then lower with control.',
    muscles: 'Hamstrings',
  },
  'leg extensions': {
    description: 'Seated at a leg extension machine, extend your lower legs to full lockout against resistance, then lower with control.',
    muscles: 'Quads',
  },
  'back extensions': {
    description: 'Lie face-down on a 45° back extension bench. Lower your torso toward the floor, then raise back up until your body is in a straight line.',
    muscles: 'Erectors, glutes, hamstrings',
  },
  'behind pulldowns': {
    description: 'At a lat pulldown machine, pull the bar down behind your head to the base of your neck, keeping your head forward. Primarily a baseball-specific arm care exercise.',
    muscles: 'Lats, rear deltoids',
  },
  'weighted half baby kip-ups': {
    description: 'Lying on your back holding a light weight, use a hip-pop to kip your legs up and load your scapulae into the floor, then lower with control.',
    muscles: 'Core, hip flexors, scapular stabilizers',
  },
  'reverse lunge': {
    description: 'Step one foot backward and lower your rear knee toward the floor, keeping your front shin vertical, then drive back to standing through your front heel.',
    muscles: 'Quads, glutes, hip flexors',
  },
  'walking lunge': {
    description: 'Step forward into a lunge, lowering your rear knee toward the floor, then drive up through your front heel and step the rear leg forward into the next lunge.',
    muscles: 'Quads, glutes, hip flexors',
  },
  'reverse flys': {
    description: 'Bent over with dumbbells hanging down, raise your arms out to the sides with a slight bend at the elbows until they reach shoulder height.',
    muscles: 'Rear deltoids, rhomboids',
  },
  '30-yard sprints': {
    description: 'Accelerate at maximum effort from a standstill over 30 yards, focusing on explosive start mechanics and full recovery between each sprint.',
    muscles: 'Quads, glutes, hamstrings, hip flexors',
  },
  'goblet squat': {
    description: 'Hold a dumbbell or kettlebell vertically at your chest. Squat deep keeping your torso upright and elbows tracking inside your knees.',
    muscles: 'Quads, glutes, core',
  },
  'push-ups': {
    description: 'From a plank position with hands just outside shoulder-width, lower your chest to the floor keeping your core tight, then push back up.',
    muscles: 'Chest, triceps, anterior deltoids, core',
  },
  'weighted push-ups': {
    description: 'Same setup as a standard push-up (hands just outside shoulder-width, core tight), with a plate or weighted vest loaded across your upper back. Lower your chest to the floor under control, then push back up without letting your hips sag.',
    muscles: 'Chest, triceps, anterior deltoids, core',
  },
  'lat pulldown': {
    description: 'Sit at a cable pulldown machine, grip the bar just outside shoulder-width with an overhand grip. Pull the bar to your upper chest by driving your elbows down.',
    muscles: 'Lats, biceps, rear deltoids',
  },
  'shoulder press': {
    description: 'Press a bar or dumbbells from shoulder height straight overhead to full arm extension, keeping your core braced.',
    muscles: 'Anterior/medial deltoids, triceps',
  },
  'db step-ups': {
    description: 'Hold dumbbells at your sides and step one foot onto a box. Drive through that heel to raise your body up, fully extending your hip, then step back down.',
    muscles: 'Quads, glutes',
  },
  'db suitcase carries': {
    description: 'Hold a heavy dumbbell in one hand at your side and walk for the prescribed distance, resisting the lateral lean caused by the unilateral load.',
    muscles: 'Core, obliques, traps, forearms',
  },

  // ─── Track & Field / Cross Country ───────────────────────────────────────
  'wicket drills': {
    description: 'Set up small hurdles or wickets at stride intervals. Run through them focusing on maintaining optimal stride length, high knee drive, and dorsiflexion.',
    muscles: 'Hip flexors, hamstrings, glutes',
  },
  'bounding': {
    description: 'Perform exaggerated running strides, driving each knee up powerfully and bounding as far as possible with each step. Focus on height and distance per bound.',
    muscles: 'Glutes, hip flexors, calves',
  },
  'single leg depth jump': {
    description: 'Step off a box and land on one leg, immediately rebounding into a maximal vertical jump off that same leg. Minimize ground contact time.',
    muscles: 'Quads, glutes, calves (single-leg plyometric)',
  },
  'single leg broad jump': {
    description: 'Balance on one leg and jump as far forward as possible, landing on the same leg with control and holding the landing position.',
    muscles: 'Quads, glutes, hamstrings, ankle stabilizers',
  },
  'approach jump work': {
    description: 'Practice full-speed running approaches into a maximal jump-off. Focus on the penultimate step and quick, powerful last step.',
    muscles: 'Quads, glutes, calves',
  },
  'rotational cable throw': {
    description: 'Stand sideways to a cable machine. Pull the handle across your body from hip to opposite shoulder in a rotational throwing pattern.',
    muscles: 'Obliques, core, hips, shoulders',
  },
  'hip 90/90 mobility circuit': {
    description: 'Sit with both legs bent at 90° (one forward, one to the side). Rock your knees from side to side in a controlled flow to improve hip internal and external rotation.',
    muscles: 'Hip capsule, adductors, glutes',
  },

  // ─── Swimming ─────────────────────────────────────────────────────────────
  'plank variations': {
    description: 'Perform standard, side, and RKC planks — maintaining a rigid body position for timed holds to build anti-extension and anti-rotation strength.',
    muscles: 'Core, transverse abdominis, obliques',
  },
  'dead bug': {
    description: 'Lie on your back with arms pointing to the ceiling and knees at 90°. Slowly lower one arm and the opposite leg toward the floor while keeping your lower back pressed flat.',
    muscles: 'Core, transverse abdominis',
  },
  'bird dog': {
    description: 'On all fours, simultaneously extend your right arm forward and left leg back, hold briefly, then switch sides.',
    muscles: 'Erectors, core, glutes',
  },

  // ─── Hockey-specific ──────────────────────────────────────────────────────
  'skating-stance lateral lunge': {
    description: 'Adopt an ice-skating forward lean, then step laterally into a lunge position, mimicking the lateral push of a skating stride. Drive back with the pushing leg.',
    muscles: 'Glutes, hip abductors, quads, adductors',
  },
  'plate overhead sit-ups': {
    description: 'Hold a plate overhead with arms locked. Perform a full sit-up keeping the plate stable overhead throughout the movement.',
    muscles: 'Rectus abdominis, hip flexors, core',
  },
  'single leg rdl': {
    description: 'Balance on one leg. Hinge at the hip, extending the free leg behind you as you lower your torso toward the floor, then return to standing by driving your hips forward.',
    muscles: 'Hamstrings, glutes, erectors, ankle stabilizers',
  },
  'single leg calf raise': {
    description: 'Stand on one foot on a step or flat ground. Rise up onto your toes as high as possible, lower slowly back below the step, and repeat.',
    muscles: 'Gastrocnemius, soleus',
  },
  'double leg calf raise': {
    description: 'Stand on both feet. Rise up onto your toes as high as possible, then lower slowly below the step height. Use added weight as needed.',
    muscles: 'Gastrocnemius, soleus',
  },
  'seated calf raise': {
    description: 'Seated with a weighted pad across your knees, rise up onto your toes as high as possible, then lower slowly for a full stretch.',
    muscles: 'Soleus, gastrocnemius',
  },
  'calf raises': {
    description: 'Stand on your toes (or a step for full range). Rise up as high as possible, lower slowly below the step height.',
    muscles: 'Gastrocnemius, soleus',
  },

  // ─── Core exercises ───────────────────────────────────────────────────────
  'core circuit': {
    description: 'A circuit of core movements (planks, sit-ups, leg raises, hollow holds, etc.) performed back-to-back with minimal rest.',
    muscles: 'Core, transverse abdominis, obliques',
  },
  'core work': {
    description: 'A rotation of core exercises (planks, dead bugs, bird dogs, or similar) for full trunk stability development.',
    muscles: 'Core, obliques, transverse abdominis',
  },
  'plank': {
    description: 'In a forearm plank position, maintain a perfectly rigid body from head to heel. Squeeze your glutes, brace your abs, and breathe normally.',
    muscles: 'Core, transverse abdominis, glutes',
  },
  'alternating v-ups': {
    description: 'Lie on your back, arms and legs extended. Crunch up, reaching your opposite hand toward your opposite foot to form a "V," alternating sides each rep.',
    muscles: 'Rectus abdominis, obliques, hip flexors',
  },
  'penguins': {
    description: 'Lie on your back with knees bent, arms at your sides. Crunch slightly and reach one hand down to tap your heel, alternating side to side in a quick, rhythmic tempo.',
    muscles: 'Obliques, rectus abdominis',
  },
  'alternating supermans': {
    description: 'Lie face-down, arms extended overhead. Lift one arm and the opposite leg off the floor simultaneously, hold briefly, lower, and alternate sides.',
    muscles: 'Erectors, glutes, rear deltoids',
  },

  // ─── Rotating core-finisher pool additions ───────────────────────────────
  'flutter kicks': {
    description: 'Lie on your back, hands under your glutes, legs extended a few inches off the floor. Alternate small, rapid up-and-down kicks while keeping your lower back pressed down.',
    muscles: 'Rectus abdominis, hip flexors',
  },
  'mountain climbers': {
    description: 'From a high plank, rapidly drive your knees toward your chest one at a time, keeping your hips low and core braced throughout.',
    muscles: 'Core, hip flexors, shoulders',
  },
  'russian twists': {
    description: 'Sit with knees bent and torso leaned back slightly, feet off the floor. Rotate your torso side to side, tapping the floor (or a weight) beside each hip.',
    muscles: 'Obliques, rectus abdominis',
  },
  'hollow hold': {
    description: 'Lie on your back, press your lower back into the floor, and lift your shoulders and legs a few inches up, arms extended overhead. Hold the "hollow" shape without arching.',
    muscles: 'Rectus abdominis, hip flexors, core',
  },
  'cherry pickers': {
    description: 'Lie on your back with legs extended toward the ceiling. Crunch up, reaching both hands toward your toes, then lower with control.',
    muscles: 'Rectus abdominis, hip flexors',
  },
  'decline bench iso': {
    description: 'On a decline bench, hold your torso in a static crunched position partway up (not lying flat, not fully sitting up) for the full duration of the hold, core braced throughout.',
    muscles: 'Rectus abdominis, hip flexors',
  },

  // ─── Lower-body accessory pool addition ──────────────────────────────────
  'tibialis raises': {
    description: 'Stand leaning back against a wall for support, heels planted a step in front of you. Lift your toes up toward your shins as high as possible, then lower with control.',
    muscles: 'Tibialis anterior (shin)',
  },

  // ─── Upper/Push day warm-up additions ────────────────────────────────────
  'prone y-t-w raises': {
    description: 'Lie face-down on an incline bench or the floor. Raise light dumbbells (or empty hands) through the Y, T, and W arm positions in sequence, squeezing your shoulder blades at the top of each.',
    muscles: 'Rear deltoids, rhomboids, lower traps',
  },
  'wall slides': {
    description: 'Stand with your back, head, and arms against a wall, elbows and wrists touching the wall in a "W" position. Slide your arms up into a "Y" while keeping contact with the wall, then return.',
    muscles: 'Lower traps, rotator cuff, scapular stabilizers',
  },
  'arm circles / pass-throughs': {
    description: 'Either drill: make large controlled circles with straight arms, or hold a band/PVC pipe wide and pass it overhead from front to back with straight arms.',
    muscles: 'Shoulders, rotator cuff, upper back',
  },

  // ─── Lower Power day warm-up additions ───────────────────────────────────
  'jog': {
    description: 'An easy, conversational-pace jog to raise heart rate and body temperature before the rest of the warm-up.',
    muscles: 'Full body, cardiovascular',
  },
  'open and close the gate': {
    description: 'Standing tall, lift one knee up and rotate it out to the side ("open the gate"), then reverse the motion, rotating the knee across your body ("close the gate"). Alternate legs.',
    muscles: 'Hip flexors, glutes, hip rotators',
  },
  'leg swings': {
    description: 'Holding a wall or rail for balance, swing one leg forward and back, then side to side, through a controlled, progressively larger range of motion. Switch legs.',
    muscles: 'Hip flexors, hamstrings, adductors',
  },
  'karaoka': {
    description: 'Moving laterally, cross one foot over the other, then behind, alternating in a fast grapevine pattern while rotating the hips and swinging the arms.',
    muscles: 'Hip rotators, adductors, abductors',
  },
  'high knees / butt kicks': {
    description: 'Either drill, moving forward: drive your knees up to hip height rapidly (high knees), or kick your heels up toward your glutes rapidly (butt kicks).',
    muscles: 'Hip flexors, hamstrings, calves',
  },
  'side shuffle': {
    description: 'In an athletic stance, shuffle laterally for a set distance without crossing your feet, staying low and quick, then repeat in the other direction.',
    muscles: 'Glutes, hip abductors, quads',
  },
  'a-skips': {
    description: 'A skipping drill driving one knee up to hip height with an active, clawing foot strike under the hips, arms driving in opposition, alternating sides as you travel forward.',
    muscles: 'Hip flexors, glutes, calves',
  },
  'a-skip to 10-yard build-up': {
    description: 'Perform A-Skips for a few steps, then transition smoothly into a 10-yard acceleration build-up to near-top speed.',
    muscles: 'Hip flexors, glutes, hamstrings, calves',
  },
  'short sprints': {
    description: 'Brief, controlled sprints (10-20 yards) at increasing effort, used to prime the nervous system for the day\'s explosive work — not a conditioning effort.',
    muscles: 'Full body, hamstrings, glutes, calves',
  },

  // ─── Squat/Hinge day warm-up additions ───────────────────────────────────
  'cat-cow': {
    description: 'On hands and knees, alternate between arching your back and dropping your belly (cow) and rounding your spine toward the ceiling (cat), moving with your breath.',
    muscles: 'Spinal erectors, core, thoracic mobility',
  },
  '90/90 hip rotations': {
    description: 'Sit with both knees bent 90°, one leg in front and one to the side. Rotate through your hips to switch the front/back leg, keeping both knees on the floor.',
    muscles: 'Hip rotators, glutes',
  },
  'clock t-spine': {
    description: 'From a hands-and-knees or side-lying position, rotate your top arm through the hours of a clock face, following it with your eyes to drive thoracic rotation.',
    muscles: 'Thoracic spine, obliques, shoulders',
  },
  'inchworms with seal stretch': {
    description: 'From standing, walk your hands out to a plank, then lower to the floor and press up into a seal-stretch back extension, before walking your hands back to your feet.',
    muscles: 'Hamstrings, core, spinal erectors, shoulders',
  },
  'thread the needle': {
    description: 'From hands and knees, thread one arm underneath your body and through the gap, rotating your torso toward the floor, then reverse and reach that arm toward the ceiling.',
    muscles: 'Thoracic spine, obliques, shoulders',
  },
  'glute bridge': {
    description: 'Lie on your back, knees bent, feet flat. Drive through your heels to lift your hips until your body forms a straight line from shoulders to knees, squeeze, then lower.',
    muscles: 'Glutes, hamstrings',
  },
  'bodyweight squat to depth': {
    description: 'Holding a squat rack or stable support to help pull yourself deeper, squat down as low as your mobility allows with control, then stand back up.',
    muscles: 'Quads, glutes, hip mobility, ankle mobility',
  },
  'ankle cradle to side lunge': {
    description: 'Stand on one leg, cradle the opposite ankle/shin up toward your chest for a hip/ankle stretch, then step that foot out into a side lunge before returning to standing.',
    muscles: 'Ankle mobility, hip flexors, adductors',
  },
  'squat to hamstring': {
    description: 'Drop into a deep bodyweight squat, then straighten your legs while keeping your hands on the floor to stretch the hamstrings, before returning to the squat. Alternate.',
    muscles: 'Hamstrings, adductors, hip mobility',
  },

  // ─── Baseball comprehensive rebuild additions ──────────────────────────────
  'bike ladder': {
    description: 'On a stationary bike, ride a symmetric interval ladder for 3 rounds: 10s hard/20s easy, 15s/15s, 20s hard/10s easy, 15s/15s, 10s hard/20s easy. Push the effort on each "on" segment, spin easy on the "off" segment.',
    muscles: 'Cardiovascular conditioning, quads, glutes',
  },
  'gorilla row': {
    description: 'Stand over two kettlebells (or dumbbells) in a hip hinge. Row one bell up to your ribs while the other hand stays braced on its handle for support, then switch sides.',
    muscles: 'Lats, rhomboids, rear deltoids, core, grip',
  },
  'side x plank': {
    description: 'From a side plank, reach your top arm and top leg out to form an X shape, holding your hips lifted and body in a straight line, then switch sides.',
    muscles: 'Obliques, glutes, shoulders (anti-rotation/lateral core)',
  },
  'long-lever plank iso': {
    description: 'Hold a forearm plank with your elbows walked out in front of your shoulders (longer lever than a standard plank), keeping hips level and core braced throughout the hold.',
    muscles: 'Core, anterior chain, shoulders',
  },
  'barbell single leg rdl': {
    description: 'Holding a barbell at your hips, balance on one leg. Hinge forward, extending the free leg behind you as you lower the bar down your shin, then drive your hips forward to return to standing.',
    muscles: 'Hamstrings, glutes, erectors, ankle stabilizers',
  },
  'db skull crushers': {
    description: 'Lying on a bench holding dumbbells overhead, lower them toward your forehead by bending only at the elbows, then extend back to lockout.',
    muscles: 'Triceps',
  },
  'diamond push-ups': {
    description: 'From a push-up position, bring your hands together under your chest so your thumbs and index fingers form a diamond. Lower your chest to your hands, then press back up.',
    muscles: 'Triceps, chest, anterior deltoids',
  },
  'cable pushdown': {
    description: 'Standing at a cable stack with a bar or rope attachment, keep your elbows pinned at your sides and extend your forearms down to lockout, then control the weight back up.',
    muscles: 'Triceps',
  },
  'db curls': {
    description: 'Standing or seated, hold dumbbells at your sides with palms forward. Curl the weights up toward your shoulders without swinging, then lower under control.',
    muscles: 'Biceps, forearms',
  },
  'cable curls': {
    description: 'Standing at a low cable pulley with a bar or rope attachment, curl the handle up toward your shoulders keeping your elbows pinned at your sides, then lower under control.',
    muscles: 'Biceps, forearms',
  },
  'incline curls': {
    description: 'Lying back on an incline bench with arms hanging straight down, curl dumbbells up toward your shoulders, keeping your upper arms stationary against the bench.',
    muscles: 'Biceps (long head emphasis)',
  },
  'cossack squat': {
    description: 'Take a wide stance, shift your weight over one bent leg and sit into a deep squat on that side while the other leg stays straight, foot flat. Push back to center and repeat on the other side.',
    muscles: 'Adductors, quads, glutes, hip mobility',
  },
  "world's greatest stretch": {
    description: 'From a lunge position, place both hands inside your front foot. Rotate your torso and reach the same-side arm toward the ceiling, then return and repeat, alternating sides.',
    muscles: 'Hip flexors, adductors, thoracic spine, hamstrings',
  },
  'copenhagen plank': {
    description: 'Support your top leg on a bench with your bottom leg free, propped up on your forearm in a side-plank position. Hold, keeping hips level, then switch sides.',
    muscles: 'Adductors, obliques, hip stability',
  },
  'inchworms': {
    description: 'From standing, hinge and walk your hands out to a plank position, then walk your feet up to your hands, keeping legs as straight as comfortable throughout.',
    muscles: 'Hamstrings, shoulders, core',
  },
  'step-ups': {
    description: 'Facing a box or bench, drive through the lead foot to step up onto it, bringing the trail leg to full hip extension at the top, then step back down under control.',
    muscles: 'Quads, glutes, hamstrings',
  },
  'suitcase carry': {
    description: 'Hold a single dumbbell or kettlebell at your side like a suitcase. Walk for the prescribed distance while resisting the urge to lean, keeping your torso upright and core braced.',
    muscles: 'Core, obliques, grip, traps',
  },
  'med ball broad jump + throw': {
    description: 'Holding a med ball between your legs, load into a squat and explosively broad-jump forward while throwing the ball forward from between your legs as you jump. Reset and repeat.',
    muscles: 'Glutes, hamstrings, quads, core (full-body power)',
  },

  // ─── Football — Linemen ───────────────────────────────────────────────────
  'barbell rdl': {
    description: 'Stand tall holding a barbell at hip height, soft bend in the knees. Hinge at the hips, lowering the bar down your legs until you feel a hamstring stretch, then drive your hips forward to return.',
    muscles: 'Hamstrings, glutes, erectors',
  },
  'hang clean above the knee': {
    description: 'Start with the bar at the hip crease, then hinge back only until the bar reaches just above your kneecaps. Explosively extend hips/knees/ankles and pull yourself under the bar to catch it on your shoulders in a quarter-squat.',
    muscles: 'Hamstrings, glutes, traps, full-body power (Olympic-lift variant)',
  },
  'clean pull': {
    description: 'Set up like a clean from the floor, but pull through triple extension (hips, knees, ankles) without turning it over or catching the bar — a heavy, technical-catch-free way to train clean-pull power.',
    muscles: 'Hamstrings, glutes, traps, erectors (full-body power)',
  },
  'single arm db split jerk': {
    description: 'Take a dumbbell to shoulder height in one hand, dip and drive it overhead while your feet split front-to-back to catch the weight locked out, then step back to standing.',
    muscles: 'Shoulders, triceps, legs (single-arm power)',
  },
  'neutral-grip pull-ups': {
    description: 'Using parallel/neutral-grip handles, pull your chin over the bar keeping elbows close to your sides, then lower under control. Set 1 is a max-effort AMRAP that sets your work-set volume for the rest of the exercise.',
    muscles: 'Lats, biceps, mid-back',
  },
  'inverted bb row': {
    description: 'Set a barbell in a rack at waist height. Lie underneath and pull your chest to the bar keeping your body in a straight line, then lower under control.',
    muscles: 'Lats, mid-back, biceps, core',
  },
  'single arm db bench': {
    description: 'Lying on a flat bench with one dumbbell, press it straight up over your chest while bracing your core against the offset load, then lower under control. Complete all reps on one side before switching.',
    muscles: 'Chest, anterior deltoids, triceps, core (anti-rotation)',
  },
  'seated single arm db overhead press': {
    description: 'Seated with a dumbbell at shoulder height in one hand, press it straight overhead to lockout while bracing your core against the offset load, then lower under control.',
    muscles: 'Shoulders, triceps, core (anti-lateral-flexion)',
  },
  'seated cable lat pulldown': {
    description: 'Seated at a lat pulldown station with an underhand grip, pull the bar down to your upper chest leading with your elbows, then control it back to full extension.',
    muscles: 'Lats, biceps, mid-back',
  },
  'standing bb ohp': {
    description: 'Bar at collarbone height, feet shoulder-width. Brace your core and press the bar straight overhead to lockout, then lower under control.',
    muscles: 'Anterior/medial deltoids, triceps, core',
  },
  'weighted dips': {
    description: 'On parallel bars with a weight belt or plate, lower your body until your shoulders dip below your elbows, then press back up to lockout.',
    muscles: 'Chest, triceps, anterior deltoids',
  },
  'farmer carries': {
    description: 'Hold a heavy dumbbell or farmer-carry handle in each hand at your sides and walk for the prescribed distance, keeping your torso tall and core braced.',
    muscles: 'Grip, traps, core, full-body stability',
  },
  'loaded carry mix': {
    description: 'Alternate between a farmer carry (a heavy load in each hand) and a suitcase carry (a heavy load in one hand) across the prescribed rounds, keeping your torso tall throughout.',
    muscles: 'Grip, traps, core, full-body stability',
  },
  'romanian deadlift above the knee': {
    description: 'Stand tall, soft bend in the knees. Hinge at the hips, lowering the bar only until it passes just below your kneecaps, then drive your hips forward to return — the beginner-safe substitute for the technical Hang Clean Above the Knee.',
    muscles: 'Hamstrings, glutes, erectors',
  },

  // ─── Repeat-Sprint/Field finisher restructure additions ───────────────────
  'easy mobility circuit': {
    description: 'A light, deload-week-only circuit of easy dynamic stretches and low-intensity movement (leg swings, hip circles, walking lunges) to stay loose without adding fatigue.',
    muscles: 'Full-body mobility, low intensity',
  },

  // ─── Variety Engine additions (feat/variety-engine) ────────────────────────
  'eccentric nordic curl': {
    description: 'Kneel with your feet anchored, starting from the TOP (torso upright) rather than the floor. Lower your torso toward the floor as slowly as possible over about 5 seconds using only your hamstrings, then use your hands to self-assist back up to the start.',
    muscles: 'Hamstrings (eccentric focus)',
  },
  'side plank sprinter pose': {
    description: 'Hold a side plank on your forearm. Drive your top knee up and forward into a sprinter\'s knee-drive position while keeping your hips lifted and square, then reset and hold. Switch sides for the prescribed time each.',
    muscles: 'Obliques, glute medius, hip flexors (anti-lateral-flexion)',
  },
  'kb tibialis raises': {
    description: 'Stand facing a wall or rack with your heels a few inches out and holding on for balance. Set a light kettlebell on the top of each foot (or one at a time) and lift your toes toward your shins, then lower under control.',
    muscles: 'Tibialis anterior (shin)',
  },

  // ─── Rugby Program Spec (v2) additions (feat/rugby-rebuild) ───────────────
  'chest-supported db row': {
    description: 'Set an incline bench to a steep angle and lie chest-down on it, a dumbbell in each hand hanging straight down. Row both dumbbells up to your ribs, squeezing your shoulder blades together, then lower under control.',
    muscles: 'Lats, rhomboids, rear delts',
  },
  'seated leg curl': {
    description: 'Sit in the leg curl machine with the pad against the back of your lower legs. Curl your heels down and back toward the seat, then return under control without letting the weight stack slam.',
    muscles: 'Hamstrings',
  },
  'lying leg curl': {
    description: 'Lie face-down on the leg curl machine with the pad just above your heels. Curl your heels up toward your glutes, then lower under control.',
    muscles: 'Hamstrings',
  },
  'stability-ball leg curl': {
    description: 'Lie on your back with your heels on top of a stability ball, arms flat on the floor for support. Bridge your hips up, then curl the ball in toward your glutes by bending your knees, and roll it back out. Keep your hips up the whole time.',
    muscles: 'Hamstrings, glutes, core',
  },
  'pallof press': {
    description: 'Stand side-on to a cable column or band anchor, hands holding the handle at your chest. Press the handle straight out in front of you and hold, resisting the pull rotating your torso toward the anchor, then bring it back to your chest.',
    muscles: 'Core (anti-rotation)',
  },
  'half-kneeling pallof press': {
    description: 'Same setup as the Pallof Press, but from a half-kneeling position (one knee down, same-side leg as the anchor down for the harder variation). Press the handle straight out and hold, resisting rotation, then return.',
    muscles: 'Core (anti-rotation), hip stability',
  },
  'cable woodchop': {
    description: 'Set a cable at high or low pulley, stand side-on to it. Pull the handle across your body in a chopping motion (high-to-low or low-to-high), rotating through your torso and hips, then return under control. Complete all reps on one side before switching.',
    muscles: 'Obliques, core (rotational)',
  },
  'half-kneeling landmine press': {
    description: 'Load a barbell into a landmine attachment (or wedge it in a corner). From a half-kneeling position, press the free end up and slightly forward at an angle until your arm is extended, then lower under control. Complete all reps on one side before switching.',
    muscles: 'Shoulders, triceps, core — angled path, no direct overhead loading',
  },
  'step-up': {
    description: 'Stand in front of a box or bench. Drive through the heel of your lead foot to step fully up onto it, standing tall at the top, then step back down under control. Complete all reps on one side before switching.',
    muscles: 'Quads, glutes',
  },
  'face pull': {
    description: 'Set a cable or band at head height. Pull the rope/band toward your face, leading with your elbows high and out to the sides, finishing with your hands by your ears and squeezing your shoulder blades together.',
    muscles: 'Rear delts, rotator cuff, upper back',
  },
  'farmer carry': {
    description: 'Pick up a heavy dumbbell or farmer\'s handle in each hand and walk the prescribed distance with a tall posture, braced core, and shoulders back — no leaning or shrugging.',
    muscles: 'Grip, traps, core, full-body stability',
  },
  'weighted/assisted pull-up': {
    description: 'Use added weight (a belt or held dumbbell) if you can already do the prescribed reps bodyweight, or a resistance band/assist machine if you can\'t — pull your chin over the bar each rep, then lower under full control.',
    muscles: 'Lats, biceps, upper back',
  },
  'db incline press': {
    description: 'Set a bench to 30–45°. Press a dumbbell in each hand from shoulder height straight up until your arms are extended, then lower under control to the stretch.',
    muscles: 'Upper chest, front delts, triceps',
  },
  'neutral-grip lat pulldown': {
    description: 'Using a neutral-grip (palms facing each other) handle, pull the bar down to your upper chest, driving your elbows down and back, then let it return under control to a full stretch.',
    muscles: 'Lats, biceps, upper back',
  },
  'db lateral raise': {
    description: 'Holding a light dumbbell in each hand at your sides, raise both arms out to shoulder height with a slight bend in the elbows, then lower under control. Don\'t use momentum.',
    muscles: 'Lateral (side) deltoids',
  },
  'db hammer curl': {
    description: 'Holding a dumbbell in each hand with a neutral (palms-facing-in) grip, curl both up toward your shoulders without swinging, then lower under control.',
    muscles: 'Biceps, forearms',
  },
  'bicep curl': {
    description: 'Holding a dumbbell or barbell with an underhand grip, curl the weight up toward your shoulders keeping your elbows pinned at your sides, then lower under control.',
    muscles: 'Biceps',
  },
  'band pull-apart': {
    description: 'Hold a light resistance band at chest height with arms extended in front of you, shoulder-width grip. Pull the band apart by driving your arms out to the sides until it touches your chest, squeezing your shoulder blades together, then return under control.',
    muscles: 'Rear delts, upper back',
  },
  'cable rear-delt fly': {
    description: 'Standing at a cable machine with the pulleys set high, cross the handles and pull them out and back in a wide arc to shoulder height, squeezing your shoulder blades together, then return under control.',
    muscles: 'Rear delts, upper back',
  },
  'ab wheel rollout': {
    description: 'Kneeling, grip the ab wheel and roll it forward as far as you can while keeping your core braced and your back flat (not sagging), then pull it back to the start using your abs, not your hips.',
    muscles: 'Core (anti-extension)',
  },
  'hollow body hold': {
    description: 'Lie on your back, lower back pressed into the floor. Lift your shoulders and legs off the ground into a slight "banana" shape, arms reaching overhead, and hold — the lower your back stays glued to the floor, the better.',
    muscles: 'Core (anti-extension)',
  },
  '10-yd shuttle sprints': {
    description: 'From a standing start, sprint 10 yards, touch the line, sprint back to the start, and touch again — that\'s one rep. Go at full effort each rep, with full recovery between reps.',
    muscles: 'Full-body speed, change of direction',
  },
  'lateral bound to stick': {
    description: 'From a single-leg athletic stance, push off explosively to bound sideways as far as you can, landing on the opposite leg and holding ("sticking") the landing for a full second before resetting. Complete all reps on one side before switching.',
    muscles: 'Glutes, quads, hip stability (lateral power)',
  },
  'takeoff sprints': {
    description: 'From a two-point stalked start (staggered feet, low body angle), drive out explosively for the full distance, focusing on short, powerful first steps before opening your stride.',
    muscles: 'Full-body acceleration',
  },
  'half-kneeling 3-stride start': {
    description: 'Start in a half-kneeling position facing the direction you\'ll sprint. Drive up and out explosively, taking exactly 3 hard strides before decelerating. Reset and repeat, alternating your down knee.',
    muscles: 'Full-body acceleration, first-step power',
  },
  'bike sprints': {
    description: 'On a stationary or assault bike, sprint at maximum effort for the prescribed time, then pedal easy for the rest interval. Stay seated or standing, whichever lets you produce the most power.',
    muscles: 'Full-body conditioning (anaerobic)',
  },
  'out-and-back shuttle': {
    description: 'From a standing start, sprint out to the marked distance, touch the ground or a cone, and sprint back to the start at full effort.',
    muscles: 'Full-body speed, change of direction',
  },
  'pallof iso hold': {
    description: 'Stand side-on to a cable column or band anchor, hands holding the handle pressed straight out from your chest. Hold that position, bracing hard to resist the pull rotating your torso toward the anchor, for the prescribed time. Switch sides.',
    muscles: 'Core (anti-rotation, isometric)',
  },
  'lateral to sprint': {
    description: 'From an athletic stance, shuffle laterally for the prescribed distance, then plant and drive immediately into a forward sprint for the second distance. One fluid transition, not two separate movements.',
    muscles: 'Full-body speed, change of direction',
  },
  'low-amplitude pogos': {
    description: 'Standing tall, hop in place using quick, small ankle-driven bounces — stiff legs, minimal knee bend, barely leaving the ground. Focus on a fast, light ground contact each rep.',
    muscles: 'Calves, ankles (reactive elasticity)',
  },
  'band row': {
    description: 'Anchor a resistance band at chest height (or loop it around a sturdy post) and step back to create tension. Row the band handles to your ribs, squeezing your shoulder blades together, then return under control.',
    muscles: 'Lats, rhomboids, rear delts',
  },
  'bodyweight split squat': {
    description: 'From a split stance (one foot forward, one back), lower your rear knee straight down toward the floor keeping your torso upright, then drive back up through your front heel. Complete all reps on one side before switching.',
    muscles: 'Quads, glutes',
  },
  'push-up': {
    description: 'Hands just outside shoulder-width, body in a straight line from head to heels. Lower your chest to just above the floor, then press back up to full arm extension without letting your hips sag.',
    muscles: 'Chest, front delts, triceps, core',
  },
  'bodyweight hamstring curl': {
    description: 'Kneeling with your ankles anchored (a partner holding them, or under a fixed pad), lower your torso forward as slowly as possible using only your hamstrings, catching yourself with your hands as you approach the floor and pushing back to the start.',
    muscles: 'Hamstrings',
  },
  'one-arm cable row': {
    description: 'Standing or kneeling, pull a single cable handle to your ribs one arm at a time, driving your elbow back and squeezing your shoulder blade, then return under control. Complete all reps on one side before switching.',
    muscles: 'Lats, rhomboids, rear delts',
  },
  'seated cable row': {
    description: 'Seated at a low cable row station, feet braced, pull the handle to your torso keeping your back flat and elbows close, then return to a full stretch under control.',
    muscles: 'Lats, rhomboids, rear delts',
  },
  'hang power clean': {
    description: 'Start standing with the bar at hip/thigh height (not the floor). Explosively extend your hips and shrug the bar upward, pulling yourself under it to catch it on your front shoulders in a quarter-squat, then stand tall.',
    muscles: 'Full-body power (hips, traps, legs) — technical, autoregulated by feel',
  },
  'a-march': {
    description: 'Walking forward, drive one knee up to hip height while staying tall through your torso, then step it down and repeat with the other leg — a marching rhythm, not a run.',
    muscles: 'Hip flexors, warm-up activation',
  },
  'squat-to-stand': {
    description: 'Stand with feet shoulder-width, hinge forward and grab your toes/shins, then sink into a deep squat while keeping hold, drive your hips up to straighten your legs (keeping the stretch), then stand all the way up.',
    muscles: 'Hamstrings, hips, ankles — dynamic warm-up',
  },
  '4-way manual neck isometrics': {
    description: 'Using your own hand (or a partner\'s) for resistance, press your head into the hand in each of 4 directions — forward, backward, and to each side — holding each for the prescribed time without letting your head actually move.',
    muscles: 'Neck (all directions, isometric)',
  },
}

// Case-insensitive lookup helper
export function lookupExercise(name) {
  if (!name) return null
  return EXERCISE_LIBRARY[name.toLowerCase()] || null
}

export default EXERCISE_LIBRARY
