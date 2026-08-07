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
  'box squat': {
    description: 'Bar on traps, feet shoulder-width, box set to just below parallel. Sit back and down under control until you touch the box, pause briefly, then drive up through your heels.',
    muscles: 'Quads, glutes, hamstrings, core',
  },
  'front split squat': {
    description: 'From a split stance, lower your rear knee toward the floor while keeping your front shin vertical, then drive back up through your front heel.',
    muscles: 'Quads, glutes, hip flexors',
  },
  'bulgarian split squat': {
    description: 'Rear foot elevated on a bench, front foot forward. Lower your rear knee toward the floor, keeping your torso upright, then drive up through your front heel.',
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
  'deadlift': {
    description: 'Bar over mid-foot, hinge at hips, brace your core, and pull the bar up by driving your hips forward to standing.',
    muscles: 'Hamstrings, glutes, erectors, traps, lats',
  },
  'trap bar deadlift': {
    description: 'Stand inside the hex bar, hinge to grab the handles, brace your core, and push the floor away as you drive your hips to standing.',
    muscles: 'Quads, glutes, hamstrings, erectors',
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
  'db lateral lunge': {
    description: 'Hold dumbbells at your sides. Step one foot wide to the side, sit your hips back and down over that foot, keeping the opposite leg straight, then push back to standing.',
    muscles: 'Quads, glutes, hip adductors',
  },
  'standing single arm cable row': {
    description: 'Stand facing a cable machine, hold one handle. Pull the handle to your hip, rotating slightly through the torso, while keeping your hips stable.',
    muscles: 'Lats, rhomboids, rear deltoids, obliques',
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
  'lat pulldown': {
    description: 'Sit at a cable pulldown machine, grip the bar just outside shoulder-width with an overhand grip. Pull the bar to your upper chest by driving your elbows down.',
    muscles: 'Lats, biceps, rear deltoids',
  },
  'shoulder press': {
    description: 'Press a bar or dumbbells from shoulder height straight overhead to full arm extension, keeping your core braced.',
    muscles: 'Anterior/medial deltoids, triceps',
  },
  'hang clean': {
    description: 'Start with the bar at mid-thigh. Dip slightly, then explosively extend your hips and shrug as you pull yourself under to catch on your front delts.',
    muscles: 'Posterior chain, traps, core',
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
  'sled sprint': {
    description: 'Attach a harness to a sled. Accelerate forward dragging the sled, maintaining forward lean and high knees.',
    muscles: 'Quads, glutes, hip flexors, calves',
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
  'hip thrust': {
    description: 'Upper back on a bench, bar across your hips. Drive through your heels to extend your hips fully, squeezing your glutes at the top.',
    muscles: 'Glutes, hamstrings',
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
}

// Case-insensitive lookup helper
export function lookupExercise(name) {
  if (!name) return null
  return EXERCISE_LIBRARY[name.toLowerCase()] || null
}

export default EXERCISE_LIBRARY
