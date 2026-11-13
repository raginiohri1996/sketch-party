// Word pack v1 — written by AI (Claude) for Sketch Party. Office-friendly, drawable, nothing offensive.
// One word per line:
//   answer[/alt/alt] | category | level (e/m/h) | emoji riddle | clue 1 (vague) | clue 2 | clue 3 (specific) | sound | near-miss words
// Alternatives are also accepted as correct. Near-miss words trigger a private "So close!".
// Sounds must be one of SOUND_IDS (synthesized in the browser); leave empty when nothing fits.

export const PACK_V1 = `
apple|Food|e|🍎|Keeps the doctor away, supposedly|Grows on trees, often red or green|Newton watched one fall|crunch|pear,cherry,tomato
banana|Food|e|🍌|Monkeys are big fans|Yellow, curved, you peel it|Classic cartoon slipping hazard||plantain,mango
pizza|Food|e|🍕|Friday office lunch favourite|Round and cut into triangles|Cheese and tomato on baked dough|sizzle|pie,flatbread,calzone
coffee|Food|e|☕|Fuel for Monday mornings|Brewed from roasted beans|Espresso, latte or americano|pour|tea,espresso,latte
donut/doughnut|Food|e|🍩|Sweet treat with a hole|Fried ring with glaze or sprinkles|A cop-show cliché snack||bagel,cookie,cake
cake|Food|e|🎂|Turns up at every office birthday|Layers, frosting and candles|You blow out the candles on it||cupcake,pie
cookie|Food|e|🍪|Crumbly snack from a jar|Chocolate chip is the classic|Websites ask you to accept these|crunch|biscuit,cracker
burger/hamburger|Food|e|🍔|Fast-food classic|A patty between two buns|Comes with fries and a soda|sizzle|sandwich,hotdog
taco|Food|e|🌮|Tuesday's favourite food|Folded shell with fillings|Mexican street-food classic|crunch|burrito,nachos
egg|Food|e|🥚|Breakfast staple|Oval with a shell|Chickens lay these||chicken,omelette
cheese|Food|e|🧀|Say this for a photo|Made from milk, sometimes full of holes|Cartoon mice love it||butter,milk
carrot|Food|e|🥕|Rabbits crunch on these|Orange and pointy|Grows underground with a leafy top|crunch|radish
cat/kitten|Animal|e|🐱|Secretly rules the internet|Purrs and has whiskers|Says meow|cat|lion,tiger,dog
dog/puppy|Animal|e|🐶|Loyal companion|Wags its tail|Man's best friend|dog|wolf,cat
fish|Animal|e|🐟|Lives in water|Has fins and gills|Nemo is one|splash|shark,whale,goldfish
bird|Animal|e|🐦|Has feathers|Builds nests and lays eggs|Tweets, but not online|chirp|parrot,pigeon
snake|Animal|e|🐍|No legs at all|Slithers along the ground|Sheds its skin|snake|worm,lizard,python
spider|Animal|e|🕷️|Eight legs|Spins webs|Bit a famous superhero||ant,insect,bug
bee|Animal|e|🐝|Busy worker|Yellow and black stripes|Makes honey|bee|wasp,fly,hornet
duck|Animal|e|🦆|Waddles|Flat bill, loves ponds|Says quack|duck|goose,swan
frog|Animal|e|🐸|Can jump really far|Green, lives near ponds|A princess kisses one|frog|toad
owl|Animal|e|🦉|Works the night shift|Big eyes, turns its head right round|Says hoo hoo|owl|eagle,bird
turtle|Animal|e|🐢|Never in a hurry|Carries its house on its back|Beat a hare in a famous race||tortoise
rabbit/bunny|Animal|e|🐰|Hops around|Long ears, fluffy tail|Easter mascot||hare,mouse
sun|Nature|e|☀️|Everyone's morning alarm|Hot, bright, up in the sky|Earth goes around it||star
moon|Nature|e|🌙|The night light|Full, half or crescent|Astronauts walked on it||planet,star
star|Nature|e|⭐|Twinkles|Drawn with five points|Make a wish on one||sun,starfish
cloud|Nature|e|☁️|Fluffy|White and drifting in the sky|Where your files are stored these days||fog,smoke
rainbow|Nature|e|🌈|Shows up after rain|Seven colours in an arch|Pot of gold at the end||arc
tree|Nature|e|🌳|Gives shade|Trunk, branches and leaves|Apples grow on one||bush,plant
flower|Nature|e|🌸|Smells nice|Petals on a stem|Bees visit it||rose,plant,tulip
cactus|Nature|e|🌵|Doesn't need much water|Green and prickly|Lives in the desert||plant
mountain|Nature|e|⛰️|Hikers' goal|Tall with a peak|Everest is the tallest||hill,volcano
house/home|Home|e|🏠|Where the heart is|Roof, walls and a door|You live in one||building,hut
door|Home|e|🚪|Open it, close it|Has a handle|Knock on it first|knock|gate,window
window|Home|e|🪟|Lets the light in|Made of glass|Also a computer system||door,glass
chair|Home|e|🪑|Have a seat|Four legs and a back|You sit on it all day||stool,sofa,bench
clock|Home|e|🕐|Always running|Has hands but no fingers|Tells the time|tick|watch,timer
key|Home|e|🔑|Small but important|Opens a lock|Lost it again?|jingle|lock,door
phone/mobile/smartphone|Tech|e|📱|Always in your pocket|Calls, texts and apps|Touchscreen you check too often|ring|tablet,telephone
laptop|Tech|e|💻|Portable work machine|Keyboard and a screen that folds|Your work computer|typing|computer,tablet,pc
book|Object|e|📖|Has pages|You read it|Libraries are full of them||notebook,magazine
car|Transport|e|🚗|Four wheels|Drive it to work|Needs fuel or a charge|engine|truck,van,bus
bus|Transport|e|🚌|Public transport|Long vehicle with lots of seats|The wheels go round and round|honk|car,van,coach
bike/bicycle|Transport|e|🚲|Two wheels|Pedal power|Some people ride one to work|ding|scooter,motorbike
boat/ship|Transport|e|⛵|Floats|Sails on the water|Row, row, row your…|splash|yacht,canoe
plane/airplane/aeroplane|Transport|e|✈️|Flies|Wings and engines|Fasten your seatbelt|whoosh|jet,helicopter
rocket|Space|e|🚀|Goes really fast|Launches into space|3, 2, 1, liftoff|whoosh|spaceship,missile
train|Transport|e|🚆|Runs on tracks|Has carriages|Choo choo|whistle|tram,subway
hat|Object|e|🎩|Goes on your head|Has a brim|Magicians pull rabbits from one||cap,crown
glasses|Object|e|👓|Help you see|Two lenses and a frame|Readers wear them on their nose||sunglasses,goggles
umbrella|Object|e|☂️|Keeps you dry|Opens up in the rain|Mary Poppins flew with one|rain|parasol
balloon|Object|e|🎈|Party decoration|Filled with air or helium|Pop it with a pin|pop|bubble,ball
gift/present|Object|e|🎁|Wrapped up|Has a bow on top|Birthday surprise||box
candle|Object|e|🕯️|Gives a little light|Wax with a wick|Blow it out on a cake||torch,lamp
ball|Sport|e|⚽|Round|Kick it, throw it, bounce it|Almost every sport needs one|boing|football,balloon
kite|Fun|e|🪁|Flies on a string|Needs a windy day|Popular at the beach|whoosh|balloon,flag
heart|Fun|e|❤️|Symbol of love|Valentine's shape|Pumps your blood|heartbeat|love
ghost|Fantasy|e|👻|Says boo|Floats around old houses|A white sheet costume||spirit,zombie
robot|Tech|e|🤖|Beep boop|Made of metal, follows commands|Might take your job one day|beep|android,cyborg
crown|Object|e|👑|Worn by royalty|Gold with jewels|Kings and queens wear one||tiara,hat
sword|Object|e|⚔️|Sharp|Knights carry one|Pulled from a stone in a legend||knife,dagger
coffee mug/mug|Office|m|☕🖐️|Lives on your desk|Holds hot drinks|"World's Best Boss" is printed on one|pour|cup,teacup
water cooler|Office|m|🚰💬|Where office gossip happens|Big bottle upside down|Dispenses cold water|bubble|fountain,tap
sticky note/post it|Office|m|🟨📝|Small and yellow|Sticks to your monitor|Peel one off the pad||note,paper
paper clip/paperclip|Office|m|📎|Holds papers together|A bent piece of wire|An old office assistant was one||staple,pin
stapler|Office|m|🗂️🔩|Desk tool|Joins pages with metal|A red one is famous from an office movie|click|staple,hole punch
calculator|Office|m|🔢|Does maths for you|Buttons with numbers|Accountants keep one close|click|computer,abacus
printer|Office|m|🖨️|Always jammed|Puts ink on paper|Out of toner again|beep|copier,scanner
keyboard|Tech|m|⌨️|Typing tool|Rows of keys, QWERTY|Plugs into a computer|typing|piano,laptop
headphones|Tech|m|🎧|Shh, I'm focusing|Go over your ears|Play music just for you|drum|earbuds,earphones
microphone|Tech|m|🎤|Is this thing on?|Karaoke essential|Makes your voice louder||mic,speaker
backpack|Object|m|🎒|Carried on your back|Straps and zips|School bag||bag,suitcase,rucksack
suitcase|Object|m|🧳|Travel companion|Rolls on little wheels|Packed for holidays||luggage,bag
wallet|Object|m|👛|Holds money|Fits in your pocket|Cards and cash||purse
calendar|Office|m|📅|Full of meetings|Days laid out in a grid|Mark the deadline here||schedule,diary
trophy|Sport|m|🏆|For the winner|A shiny cup|Lifted after a final||medal,cup
lightbulb/light bulb|Object|m|💡|The idea symbol|Glass and glowing|Edison is famous for it|click|lamp,idea
battery|Tech|m|🔋|Always at 2%|Has plus and minus ends|Powers your gadgets|beep|charger
elevator/lift|Place|m|🛗|Goes up and down|Press a floor button|Awkward small talk happens here|ding|escalator,stairs
ladder|Object|m|🪜|Climb it|Rungs between two rails|Don't walk under it||stairs
bridge|Place|m|🌉|Crosses the water|Cars drive over it|Golden Gate is one||tunnel,road
castle|Place|m|🏰|Royal home|Towers and a moat|A sandcastle's big brother||palace,fort
lighthouse|Place|m|🌊💡🗼|Stands by the sea|Tall tower with a light|Guides ships at night|honk|tower
windmill|Place|m|🌬️🌾|Spins in the wind|Big sails on a tower|The Netherlands is famous for them|whoosh|fan,turbine
volcano|Nature|m|🌋|A very hot mountain|Spews lava|It erupts|thunder|mountain
island|Nature|m|🏝️|Surrounded by water|Palm trees and sand|Where castaways end up|splash|beach
waterfall|Nature|m|🏞️💧|Water on the move|Niagara is famous|A river drops over a cliff|rain|river,fountain
penguin|Animal|m|🐧|Always wears a tuxedo|A bird that can't fly|Lives in Antarctica|penguin|puffin
giraffe|Animal|m|🦒|Very tall|Long neck and spots|Eats leaves from treetops||camel,zebra
elephant|Animal|m|🐘|Never forgets|Big ears and a trunk|Largest animal on land|elephant|mammoth,rhino
octopus|Animal|m|🐙|Eight arms|Squirts ink|Lives on the sea floor|bubble|squid,jellyfish
dolphin|Animal|m|🐬|Very clever|Swims and clicks|Jumps out of the waves|splash|shark,whale
kangaroo|Animal|m|🦘|Hops|Has a pouch|From Australia|boing|wallaby
flamingo|Animal|m|🦩|Pink|Stands on one leg|A classic lawn ornament||heron,swan
dinosaur/t rex|Animal|m|🦖|Extinct|A huge reptile from millions of years ago|Jurassic Park|roar|dragon,lizard
unicorn|Fantasy|m|🦄|Magical|A horse with a horn|A startup worth a billion||horse,pegasus
dragon|Fantasy|m|🐉|Breathes fire|Wings and scales|Guards treasure in stories|roar|dinosaur,lizard
popcorn|Food|m|🍿|Movie snack|Pops when heated|Corn that explodes|pop|corn
sandwich|Food|m|🥪|Lunch staple|Fillings between bread|An earl gave it its name, supposedly||burger,toast
spaghetti/pasta|Food|m|🍝|Long and twirly|Italian dinner|Meatballs on top||noodles
sushi|Food|m|🍣|Japanese dish|Rice and raw fish|Eaten with chopsticks||rice,fish
ice cream|Food|m|🍦|Melts fast|Comes in a cone|A scoop of vanilla||gelato,yogurt
pineapple|Food|m|🍍|Spiky on the outside|Tropical yellow fruit|Controversial on pizza||coconut,mango
watermelon|Food|m|🍉|Summer fruit|Green outside, red inside|Full of black seeds|crunch|melon
cupcake|Food|m|🧁|A small cake|Frosting on top|Baked in a paper cup||muffin,cake
pancake|Food|m|🥞|Breakfast stack|Flat and round|Maple syrup on top|sizzle|waffle,crepe
guitar|Music|m|🎸|Strummed|Six strings|A rock star's instrument|pluck|violin,banjo
piano|Music|m|🎹|Black and white keys|A big instrument|Mozart played one|piano|keyboard,organ
drums/drum kit|Music|m|🥁|Make some noise|Hit them with sticks|Keeps the beat|drum|bongos
trumpet|Music|m|🎺|Brass|Three valves|Jazz players blow it|trumpet|horn,saxophone
camera|Tech|m|📷|Say cheese|Takes photos|Has a lens and a flash|click|phone
television/tv|Tech|m|📺|Binge watching|Screen in the living room|The remote control's best friend|rain|monitor
satellite|Space|m|🛰️|Orbits the Earth|Sends signals from above|GPS relies on them|beep|space station
telescope|Space|m|🔭|Look at the stars|Long tube with lenses|Astronomers use it||microscope,binoculars
compass|Object|m|🧭|Find your way|The needle points north|Explorers carry one||map
magnet|Object|m|🧲|Attracts things|Red and blue horseshoe|Holds notes on the fridge||iron
skateboard|Sport|m|🛹|A board on wheels|Do a kickflip|Popular at the skate park|whoosh|scooter,surfboard
helicopter|Transport|m|🚁|Hovers|Spinning blades on top|Also called a chopper|engine|drone,plane
submarine|Transport|m|🌊🔭|Goes underwater|Has a periscope|A band sang about a yellow one|bubble|boat,ship
tractor|Transport|m|🚜|Farm vehicle|Big back wheels|Pulls a plough|engine|truck
ambulance|Transport|m|🚑|Emergency|Rushes to the hospital|Flashing lights on top|siren|police car,fire truck
fire truck/fire engine|Transport|m|🚒|Red|Carries a ladder and a hose|Races to fires|siren|ambulance
parachute|Sport|m|🪂|Slows your fall|Opens up in the sky|Skydivers need one|whoosh|kite,umbrella
hot air balloon|Transport|m|🎈🔥🧺|Floats very high|A basket under a giant balloon|A burner keeps it up|whoosh|balloon,blimp
toothbrush|Home|m|🪥|Twice a day|Bristles on a stick|Use it with paste||comb,brush
scissors|Office|m|✂️|Cut it out|Two blades|Rock, paper, …|click|knife,shears
hammer|Object|m|🔨|Bang bang|Hits nails|A Norse god carries a famous one|knock|mallet,axe
paintbrush|Object|m|🖌️|An artist's tool|Bristles dipped in paint|Picasso used one||brush,pencil
envelope|Office|m|✉️|Holds a letter|Paper with a flap|Needs a stamp||letter,mail
mailbox/postbox|Office|m|📫|Letters arrive here|Has a little flag|The postman stops here||inbox
treasure map|Fantasy|m|🗺️❌|Pirates follow it|X marks the spot|Leads to buried gold||map,treasure chest
tent|Place|m|⛺|Camping shelter|Poles and fabric|Pitch it outdoors||tipi,hut
campfire|Nature|m|🔥🪵|Toast marshmallows here|Logs burning outdoors|Sing songs around it|sizzle|fire,bonfire
fishing rod|Sport|m|🎣|Needs patience|Line, hook and reel|Catch of the day|splash|fishing pole
snowflake|Weather|m|❄️|Cold|No two are alike|Falls in winter||snow,ice
tornado|Weather|m|🌪️|It spins|A funnel of wind|Took a girl from Kansas to Oz|whoosh|hurricane,storm
lightning|Weather|m|⚡|A flash in the sky|Comes before thunder|Zeus throws it|thunder|storm
video call|Office|h|💻👋|You're on mute|Cameras on, everyone in little boxes|A Zoom or Teams meeting|ring|zoom call,meeting
reply all|Office|h|📧😱|An email mistake|Sends to everyone on the thread|The most dangerous button in your inbox|ding|email
deadline|Office|h|⏰😰|Due date|When it all has to be done|Whooshes by when you're not looking|tick|due date,timeline
brainstorm|Office|h|🧠⛈️|An ideas meeting|Throw ideas at the whiteboard|No bad ideas here||idea,meeting
coffee break|Office|h|☕⏸️|A pause from work|Grab a cup with colleagues|The best fifteen minutes of the morning|pour|lunch break
team meeting|Office|h|👥📅|Could have been an email|Everyone around one table|The weekly sync||meeting
out of office|Office|h|🏖️📧|Auto-reply|Not at your desk|On holiday, back Monday||vacation,holiday
spreadsheet|Office|h|📊|Rows and columns|Excel is one|Where formulas live|typing|table,chart
password|Tech|h|🔑🔒|Keep it secret|Letters, numbers and symbols|Never "123456"|typing|pin,login
firewall|Tech|h|🔥🧱|A security barrier|Blocks bad traffic|Protects the network||wall,antivirus
wifi signal/wifi|Tech|h|📶|Bars on your screen|Wireless connection strength|Is the internet down again?||signal
loading bar/progress bar|Tech|h|⏳|Please wait|Fills up slowly|Stuck at 99%||loading
screenshot|Tech|h|📸🖥️|Capture the screen|An image of your display|The print screen key|click|photo
inbox zero|Office|h|📥0️⃣|The dream|No unread emails|Every message dealt with|chime|inbox,email
promotion|Office|h|📈🎉|Climbing the ladder|New title, more pay|Moving up at work|trumpet|raise,bonus
handshake|Office|h|🤝|Deal sealed|Two hands meet|How you greet a new client||high five
presentation|Office|h|📽️|Slides|Talk in front of the team|Next slide, please|click|slideshow,powerpoint
whiteboard|Office|h|⬜🖊️|Wipe it clean|Write on it with markers|On the meeting room wall||blackboard,board
org chart|Office|h|🧑‍💼🌳|Who reports to whom|Boxes joined by lines|The company family tree||chart,hierarchy
fire drill|Office|h|🚨🔥|Only a practice|Alarm, then everyone goes outside|Take the stairs, not the lift|siren|fire alarm
office plant|Office|h|🪴|Desk decoration|Needs water nobody remembers to give|A green colleague in a pot||plant,cactus
time zone/timezone|Office|h|🌍🕐|A meeting at 3am for someone|Clocks differ around the world|GMT or PST||clock
jet lag|Transport|h|✈️😴|Tired after flying|Your body clock is confused|Wide awake at 4am in a new city||tired,sleepy
traffic jam|Transport|h|🚗🚗🚗|Stuck|Cars bumper to bumper|A rush hour nightmare|honk|traffic,gridlock
lunch break|Office|h|🥪⏸️|Midday pause|Leave your desk to eat|The best hour of the workday||coffee break
payday|Office|h|💰📅|Favourite day of the month|Your salary arrives|Money in the bank|jingle|salary,bonus
quarterly report|Office|h|📊📈|Every three months|Numbers for the board|Q3 results||report,earnings
elevator pitch|Office|h|🛗🎤|Short and sweet|Sell an idea in thirty seconds|Pitch while riding the lift|ding|pitch,presentation
ping pong table/table tennis|Fun|h|🏓|Startup office essential|Green table with a net|Paddles and a tiny ball|boing|tennis
bean bag|Home|h|🫘🪑|Squishy seat|Filled with little beads|The chill corner chair||sofa,cushion
standing desk|Office|h|🧍🖥️|A healthier workday|A desk at chest height|Raise it up and stand||desk,table
traffic light|Transport|h|🚦|Red, amber, green|Controls cars at junctions|Stop and go signal|beep|stop sign
roller coaster|Fun|h|🎢|Ups and downs|A fast theme park ride|Hands up on the drop|whoosh|ride,theme park
ferris wheel|Fun|h|🎡|A giant wheel|Pods go round slowly|The London Eye is one||carousel
haunted house|Fantasy|h|🏚️👻|Spooky|Ghosts live here|Creaky doors and cobwebs|knock|castle,ghost
treasure chest|Fantasy|h|💰📦|Pirate loot|A wooden box full of gold|Buried where X marks the spot|jingle|chest,box
black hole|Space|h|🕳️🌌|Nothing escapes|A collapsed giant star|It swallows light||wormhole
solar system|Space|h|☀️🪐|Our cosmic neighbourhood|Planets orbiting the sun|Eight planets||galaxy,universe
time machine|Fantasy|h|⏰🚀|Travel through the years|A DeLorean was one in a film|Visit the past or the future||clock
magic carpet|Fantasy|h|🧞🪄|A flying rug|Aladdin rode one|A whole new world||rug,carpet
message in a bottle|Fantasy|h|🍾📜|A castaway's mail|A note floating at sea|Found washed up on a beach|splash|bottle,letter
raindrop/drop|Weather|e|💧|Tiny and wet|Falls from a cloud|Plinks on the window|drip|rain,water,droplet
wind chime/windchime|Home|m|🎐|Sings when the breeze blows|Hollow tubes hanging on a porch|Tinkles in the wind|windchime|bell,chimes
doorbell|Home|m|🔔🚪|Someone's here|A button by the front door|Ding dong!|ding|bell,door
alarm clock|Home|m|⏰😫|Nobody's favourite sound|Wakes you up in the morning|Hit snooze|ring|clock,alarm
dripping tap/dripping faucet/leaky tap|Home|h|🚰💧|Keeps you up at night|Time to call a plumber|Plip… plip… plip from the sink|drip|tap,faucet,sink
lion|Animal|e|🦁|King of the jungle|Big cat with a mane|Simba grew up to be one|lion|tiger,cat,leopard
cow|Animal|e|🐄|Lives on a farm|Black and white patches|Gives us milk|cow|bull,ox,calf
horse|Animal|e|🐴|You can ride it|Has a mane and hooves|Gallops and neighs|horse|pony,donkey,zebra
sheep/lamb|Animal|e|🐑|Very woolly|Lives in a flock|Count them to fall asleep|sheep|goat,ram
rooster/cockerel|Animal|m|🐓|Farm alarm clock|Has a red comb on its head|Cock-a-doodle-doo at sunrise|rooster|chicken,hen
wolf|Animal|m|🐺|Lives in a pack|Wild cousin of the dog|Howls at the full moon|wolf|dog,fox,coyote
pig|Animal|e|🐷|Loves rolling in mud|Pink with a curly tail|Says oink|pig|hog,boar
crow|Animal|m|🐦‍⬛|A clever black bird|Scarecrows are meant to scare it|Says caw|crow|raven,blackbird
monkey|Animal|e|🐒|Loves bananas|Swings from tree to tree|A cheeky primate with a long tail|monkey|ape,chimpanzee,gorilla
`;
