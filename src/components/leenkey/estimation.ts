import { initialForm, type LeenkeyForm } from "./types";
import { POSTES_TECHNIQUES, statsLocatives, totalCharges } from "./immeuble-calc";
import { impactEnergie } from "./energie";

export interface FactorImpact {
  label: string;
  impact: number; // percentage points, e.g. +5 or -3
  detail: string;
}

export interface Recommendation {
  title: string;
  description: string;
  uplift?: string;
}

export interface EstimationResult {
  prixEstime: number;
  prixBas: number;
  prixHaut: number;
  prixM2: number;
  prixM2Marche: number;
  deltaMarche: number; // %
  surface: number;
  fiabilite: "elevee" | "moyenne" | "faible";
  fiabiliteScore: number; // 0-100
  scoreAttractivite: number; // 0-100
  delaiVente: string;
  tensionMarche: "faible" | "moderee" | "forte";
  facteurs: FactorImpact[];
  recommandations: Recommendation[];
}

/**
 * Prix moyen du m² résidentiel par département (€/m²).
 *
 * ⚠️ Ordres de grandeur, à recalibrer sur DVF.
 *
 * La table précédente ne couvrait que 20 départements et renvoyait 3 500 €/m²
 * pour les 81 autres : un bien dans la Creuse (~950 €/m² réels) était calculé
 * sur une base 3,7 fois trop élevée, et un bien en Haute-Savoie sur une base
 * trop basse. C'était la première cause d'estimations très au-dessus ou
 * très en dessous du marché.
 */
const PRIX_DEPT: Record<string, [number, number, number]> = {
  "01": [2264, 2027, 2228],
  "02": [1133, 1184, 1137],
  "03": [1008, 1348, 1027],
  "04": [2250, 2000, 2174],
  "05": [2606, 2642, 2632],
  "06": [3974, 4729, 4592],
  "07": [1837, 1237, 1758],
  "08": [1162, 901, 1135],
  "09": [1295, 1287, 1294],
  "10": [1444, 1741, 1515],
  "11": [1505, 1798, 1545],
  "12": [1278, 1401, 1286],
  "13": [3628, 3125, 3385],
  "14": [2237, 3549, 2377],
  "15": [1091, 1200, 1105],
  "16": [1167, 1564, 1186],
  "17": [2440, 3849, 2560],
  "18": [1000, 1471, 1031],
  "19": [1124, 1313, 1130],
  "21": [2044, 2708, 2195],
  "22": [1672, 2189, 1709],
  "23": [745, 754, 745],
  "24": [1167, 1512, 1187],
  "25": [1805, 2031, 1857],
  "26": [2192, 1750, 2113],
  "27": [1528, 1708, 1542],
  "28": [1704, 1987, 1722],
  "29": [1944, 2250, 1979],
  "2A": [3475, 3896, 3692],
  "2B": [2820, 2895, 2870],
  "30": [2260, 1957, 2206],
  "31": [2522, 3533, 2639],
  "32": [1293, 1476, 1306],
  "33": [2819, 4025, 3113],
  "34": [2573, 3028, 2694],
  "35": [2300, 3774, 2387],
  "36": [921, 1010, 922],
  "37": [1996, 2726, 2097],
  "38": [2537, 2500, 2527],
  "39": [1464, 1459, 1463],
  "40": [2222, 2600, 2273],
  "41": [1283, 1765, 1311],
  "42": [1756, 1259, 1623],
  "43": [1193, 1275, 1200],
  "44": [2778, 3424, 2877],
  "45": [1633, 2476, 1703],
  "46": [1210, 1389, 1227],
  "47": [1185, 1308, 1194],
  "48": [1328, 1267, 1321],
  "49": [1932, 3086, 1983],
  "50": [1555, 2444, 1615],
  "51": [1851, 2524, 1953],
  "52": [894, 1019, 900],
  "53": [1419, 1911, 1442],
  "54": [1786, 1935, 1812],
  "55": [926, 923, 926],
  "56": [2238, 2968, 2300],
  "57": [1880, 2140, 2000], // hors DVF
  "58": [909, 973, 910],
  "59": [1905, 2691, 1962],
  "60": [2089, 2181, 2096],
  "61": [1083, 1136, 1085],
  "62": [1607, 1867, 1618],
  "63": [1557, 2078, 1643],
  "64": [1939, 3090, 2220],
  "65": [1533, 1597, 1549],
  "66": [2253, 2114, 2236],
  "67": [2820, 3210, 3000], // hors DVF
  "68": [2350, 2675, 2500], // hors DVF
  "69": [3133, 4066, 3503],
  "70": [995, 917, 986],
  "71": [1273, 1396, 1287],
  "72": [1458, 2125, 1494],
  "73": [2857, 4017, 3273],
  "74": [4182, 4231, 4186],
  "75": [12488, 9630, 9641],
  "76": [1844, 2398, 1932],
  "77": [2686, 2975, 2716],
  "78": [3460, 4444, 3568],
  "79": [1287, 1463, 1296],
  "80": [1600, 2652, 1684],
  "81": [1349, 1786, 1389],
  "82": [1458, 1618, 1475],
  "83": [3377, 2966, 3192],
  "84": [2500, 2240, 2435],
  "85": [2242, 3121, 2280],
  "86": [1280, 2162, 1360],
  "87": [1148, 1452, 1200],
  "88": [1114, 1126, 1116],
  "89": [1233, 1280, 1238],
  "90": [1583, 1242, 1488],
  "91": [3222, 2867, 3187],
  "92": [7116, 6700, 6833],
  "93": [3733, 4484, 3947],
  "94": [4614, 5114, 4773],
  "95": [3444, 3286, 3427],
  "971": [2318, 3201, 2671],
  "972": [2000, 2548, 2209],
  "973": [2375, 2580, 2460],
  "974": [2423, 2544, 2440],
  "976": [1880, 2140, 2000], // hors DVF
};
/** Repli quand le code postal est absent ou illisible. */
const PRIX_DEPT_DEFAUT = 1800;

/**
 * Paris par arrondissement : l'écart entre le 6e et le 19e dépasse 70 %,
 * une moyenne parisienne unique n'a aucun sens.
 */
const PRIX_PARIS: Record<string, number> = {
  "75001": 11816,
  "75002": 10846,
  "75003": 11429,
  "75004": 12378,
  "75005": 11620,
  "75006": 13571,
  "75007": 12892,
  "75008": 11402,
  "75009": 10526,
  "75010": 9231,
  "75011": 9800,
  "75012": 8947,
  "75013": 8824,
  "75014": 9362,
  "75015": 9425,
  "75016": 10526,
  "75017": 9749,
  "75018": 8750,
  "75019": 8130,
  "75020": 8403,
};

const PRIX_VILLE: Record<string, [number, number, number]> = {
  abbeville: [1556, 1530, 1530],
  acheres: [3784, 3765, 3765],
  agde: [3145, 2786, 2978],
  agen: [1698, 1706, 1706],
  "aigues-mortes": [3921, 3788, 3788],
  "aire-sur-l'adour": [1437, 1429, 1429],
  "aire-sur-la-lys": [1349, 1250, 1250],
  "aix-en-provence": [5253, 5150, 5167],
  "aix-les-bains": [4406, 4282, 4342],
  aizenay: [2320, 2326, 2326],
  ajaccio: [3820, 3625, 3646],
  albert: [1355, 1349, 1349],
  albertville: [2617, 2103, 2433],
  albi: [1857, 2457, 1982],
  alencon: [1508, 1484, 1484],
  ales: [2007, 1367, 1862],
  alfortville: [5805, 4881, 5264],
  allauch: [4506, 2946, 4187],
  allevard: [1852, 1773, 1852],
  allos: [2810, 2632, 2810],
  "ambares-et-lagrave": [2555, 2553, 2553],
  "amberieu-en-bugey": [2359, 2328, 2328],
  ambert: [897, 897, 897],
  amboise: [2175, 2130, 2130],
  "amelie-les-bains-palalda": [1441, 1382, 1441],
  amiens: [2192, 2675, 2344],
  amilly: [1518, 1535, 1535],
  "ancenis-saint-gereon": [2500, 2452, 2452],
  "andernos-les-bains": [4740, 4651, 4651],
  andresy: [3640, 3562, 3562],
  angers: [3153, 3750, 3400],
  anglet: [6089, 5100, 5735],
  angouleme: [1635, 1593, 1626],
  aniche: [1130, 1127, 1127],
  annecy: [5619, 5484, 5522],
  annonay: [1927, 894, 1263],
  annœullin: [2163, 2149, 2149],
  antibes: [5936, 5125, 5262],
  antony: [5665, 5560, 5643],
  anzin: [1069, 1081, 1081],
  apt: [2361, 1417, 1957],
  arcachon: [7324, 6606, 7071],
  ares: [4471, 4405, 4405],
  "argeles-sur-mer": [3039, 3020, 3038],
  argentan: [1464, 1455, 1455],
  argenteuil: [3795, 3114, 3662],
  arles: [2688, 2913, 2727],
  armentieres: [1822, 1619, 1793],
  arques: [1613, 1609, 1609],
  arras: [1887, 2308, 2028],
  arzon: [5000, 5138, 5124],
  "asnieres-sur-seine": [7943, 6213, 6479],
  "athis-mons": [3903, 3864, 3864],
  aubagne: [4167, 2422, 2874],
  aubenas: [1566, 1500, 1549],
  aubergenville: [3148, 3073, 3073],
  aubervilliers: [3913, 3958, 3929],
  aubiere: [2419, 2389, 2389],
  auch: [1633, 1740, 1660],
  auchel: [1096, 1052, 1052],
  audincourt: [1346, 1216, 1216],
  "aulnay-sous-bois": [3651, 3562, 3630],
  "aulnoy-lez-valenciennes": [1518, 1584, 1584],
  ault: [2059, 2167, 2167],
  auray: [3456, 3405, 3405],
  aurillac: [1691, 1140, 1444],
  auriol: [4160, 3577, 3577],
  aussillon: [1196, 1196, 1196],
  auterive: [2230, 2022, 2022],
  autun: [1177, 1140, 1140],
  auxerre: [1746, 1415, 1605],
  avignon: [2430, 2599, 2500],
  avion: [1537, 1515, 1515],
  avranches: [2020, 2040, 2040],
  avrille: [3030, 3023, 3023],
  aytre: [3484, 3479, 3479],
  "bagneres-de-bigorre": [1723, 2000, 1929],
  "bagneres-de-luchon": [1684, 2319, 2174],
  bagneux: [5993, 5714, 5912],
  bagnolet: [6279, 5610, 5800],
  "bagnols-sur-ceze": [1928, 1824, 1824],
  "baie-mahault": [2247, 2358, 2358],
  bailleul: [2174, 2174, 2174],
  "bain-de-bretagne": [2141, 2141, 2141],
  "balaruc-les-bains": [3660, 4023, 3942],
  balma: [3800, 3733, 3733],
  bandol: [6369, 5778, 5849],
  "banyuls-sur-mer": [3167, 2969, 3085],
  "bar-le-duc": [1214, 1146, 1146],
  barentin: [1938, 1931, 1931],
  bastia: [2941, 2957, 2941],
  baud: [1857, 1857, 1857],
  "bauge-en-anjou": [1080, 1080, 1080],
  bayeux: [2615, 2418, 2576],
  bayonne: [4424, 3800, 3889],
  beaucaire: [1905, 1175, 1460],
  beauchamp: [4023, 3995, 3995],
  beaugency: [1613, 1608, 1608],
  "beaumont-sur-oise": [2814, 2872, 2872],
  beaune: [2514, 2700, 2581],
  "beaupreau-en-mauges": [1785, 1769, 1769],
  beausoleil: [6643, 6613, 6643],
  beauvais: [2088, 2119, 2094],
  bedarieux: [1131, 900, 900],
  begles: [3972, 3397, 3757],
  belfort: [1617, 1303, 1377],
  "bellerive-sur-allier": [1770, 1760, 1760],
  "belleville-en-beaujolais": [2752, 2594, 2594],
  berck: [2406, 2961, 2641],
  bergerac: [1583, 1333, 1548],
  bernay: [1536, 1584, 1584],
  besancon: [2470, 2296, 2346],
  bethune: [1463, 1720, 1552],
  betton: [3404, 3404, 3404],
  beynes: [3674, 3675, 3675],
  beziers: [2138, 1333, 1812],
  bezons: [4378, 4345, 4345],
  biarritz: [7662, 7143, 7182],
  bihorel: [2673, 1722, 2012],
  "binic-etables-sur-mer": [2923, 2923, 2923],
  biscarrosse: [3906, 3921, 3913],
  blagnac: [3566, 2616, 3226],
  blain: [2222, 2214, 2214],
  blanquefort: [3291, 3232, 3232],
  blois: [1783, 1875, 1814],
  bobigny: [3410, 2846, 3242],
  "bois-colombes": [7972, 5921, 6820],
  "bois-guillaume": [2947, 2947, 2947],
  bolbec: [1369, 1320, 1320],
  bollene: [2130, 1970, 1970],
  bolquere: [4565, 2975, 3443],
  bompas: [2363, 2333, 2333],
  "bonchamp-les-laval": [2226, 2226, 2226],
  bondoufle: [2949, 2959, 2959],
  bondues: [3680, 3680, 3680],
  bondy: [3472, 3409, 3410],
  bordeaux: [4816, 4445, 4545],
  "bormes-les-mimosas": [5652, 4241, 5270],
  bouguenais: [2869, 2881, 2881],
  "boulazac isle manoire": [1550, 1550, 1550],
  "boulogne-billancourt": [12363, 8321, 8400],
  "boulogne-sur-mer": [1596, 1478, 1557],
  "bourg-de-peage": [2329, 2122, 2122],
  "bourg-en-bresse": [2209, 1996, 2125],
  "bourg-la-reine": [7066, 5391, 6312],
  "bourg-les-valence": [2429, 2000, 2379],
  "bourg-saint-andeol": [1765, 1625, 1625],
  "bourg-saint-maurice": [5700, 5922, 5700],
  bourges: [1667, 1633, 1648],
  "bourgoin-jallieu": [2682, 2221, 2561],
  "bray-dunes": [2382, 3111, 2566],
  brech: [2624, 2621, 2621],
  bressuire: [1385, 1430, 1430],
  brest: [2363, 2500, 2409],
  "bretignolles-sur-mer": [3598, 3636, 3636],
  "bretigny-sur-orge": [3054, 3065, 3065],
  briancon: [3674, 2654, 2857],
  "brie-comte-robert": [3319, 3356, 3356],
  brignoles: [2851, 1735, 2364],
  "brissac loire aubance": [2000, 2000, 2000],
  "brive-la-gaillarde": [1850, 1741, 1838],
  bron: [4181, 3864, 4121],
  "bruay-la-buissiere": [1282, 1282, 1282],
  bruges: [4200, 4182, 4182],
  brunoy: [3790, 3737, 3737],
  bruz: [3062, 3024, 3024],
  "bry-sur-marne": [5707, 5571, 5571],
  "bully-les-mines": [1602, 1600, 1600],
  "bussy-saint-georges": [3967, 4099, 4099],
  buxerolles: [2059, 2078, 2078],
  cabestany: [2471, 2471, 2471],
  cabourg: [4498, 5396, 4984],
  cachan: [5667, 4779, 5108],
  caen: [3321, 3444, 3413],
  "cagnes-sur-mer": [5464, 4711, 4833],
  cahors: [1505, 1512, 1512],
  calais: [1509, 1654, 1522],
  "caluire-et-cuire": [4877, 4118, 4185],
  calvisson: [3103, 3014, 3014],
  cambrai: [1269, 1375, 1280],
  camiers: [3148, 3319, 3319],
  cancale: [3345, 3593, 3593],
  "canet-en-roussillon": [3099, 3148, 3125],
  cannes: [5363, 5667, 5645],
  canohes: [2500, 2500, 2500],
  capbreton: [7047, 6855, 6855],
  carcassonne: [1563, 1250, 1477],
  "carentan-les-marais": [1623, 1616, 1616],
  "carhaix-plouguer": [1262, 1262, 1262],
  carmaux: [1067, 1053, 1053],
  carnac: [5321, 5226, 5226],
  carpentras: [2286, 1346, 1875],
  carquefou: [3250, 3227, 3227],
  carqueiranne: [6209, 4431, 4974],
  "carrieres-sous-poissy": [3555, 3568, 3568],
  carvin: [1782, 1774, 1774],
  "castanet-tolosan": [3246, 3220, 3220],
  castelginest: [2911, 2910, 2910],
  "castelnau-le-lez": [4267, 3948, 4111],
  castelnaudary: [1436, 753, 1259],
  castelsarrasin: [1371, 1358, 1358],
  castres: [1428, 1623, 1471],
  caudan: [2344, 2354, 2354],
  "caudebec-les-elbeuf": [1633, 1484, 1484],
  caudry: [936, 936, 936],
  caussade: [1446, 1408, 1408],
  cauterets: [3212, 3206, 3212],
  cavaillon: [2500, 1732, 2206],
  "cavalaire-sur-mer": [5388, 4916, 5163],
  cayenne: [2362, 2581, 2517],
  "cazouls-les-beziers": [1629, 1560, 1560],
  cebazat: [2240, 2240, 2240],
  cenon: [3234, 2952, 3145],
  ceret: [2380, 2170, 2170],
  cergy: [3029, 4109, 3253],
  cesson: [2807, 2808, 2808],
  "cesson-sevigne": [3782, 3782, 3782],
  cestas: [3592, 3590, 3590],
  challans: [2603, 2619, 2619],
  "chalon-sur-saone": [1911, 1429, 1556],
  "chalons-en-champagne": [1735, 1420, 1594],
  chamalieres: [3254, 2880, 2880],
  chambery: [3648, 3138, 3310],
  "chambray-les-tours": [2653, 2577, 2577],
  "chamonix-mont-blanc": [12751, 9027, 9442],
  "champigny-sur-marne": [4256, 3750, 4154],
  chantonnay: [1612, 1613, 1613],
  "charleville-mezieres": [1667, 1261, 1549],
  chartres: [2357, 2483, 2423],
  "chateau-gontier-sur-mayenne": [1803, 1764, 1764],
  "chateau-thierry": [1731, 1724, 1724],
  chateaubriant: [1806, 1807, 1807],
  chateaudun: [1282, 1285, 1285],
  chateaugiron: [2800, 2795, 2795],
  "chateauneuf-les-martigues": [3766, 3661, 3661],
  "chateauneuf-sur-loire": [1783, 1774, 1774],
  chateaurenard: [2589, 2500, 2500],
  chateauroux: [1354, 1343, 1343],
  "chatel-guyon": [2167, 1750, 1884],
  "chatelaillon-plage": [4514, 4720, 4720],
  chatellerault: [1222, 1200, 1200],
  chatillon: [6845, 5909, 6452],
  chatou: [6707, 6217, 6217],
  "chaumes-en-retz": [2611, 2565, 2565],
  chaumont: [1522, 1476, 1476],
  chauny: [1160, 1154, 1154],
  chauray: [2188, 2188, 2188],
  chauvigny: [1279, 1267, 1267],
  chaville: [7017, 6048, 6413],
  checy: [2061, 2064, 2064],
  chelles: [3564, 3204, 3509],
  "chemille-en-anjou": [1496, 1491, 1491],
  "cherbourg-en-cotentin": [2267, 2181, 2246],
  "chevigny-saint-sauveur": [2882, 2757, 2757],
  chinon: [1465, 1428, 1428],
  "choisy-le-roi": [4136, 3762, 3974],
  cholet: [2066, 2309, 2083],
  clamart: [6955, 5857, 6575],
  "claye-souilly": [3178, 3239, 3239],
  clermont: [2133, 2000, 2093],
  "clermont-ferrand": [2372, 2387, 2377],
  "clermont-l'herault": [2365, 1970, 1970],
  clichy: [6719, 6700, 6719],
  "clohars-carnoet": [2757, 2800, 2800],
  cognac: [1579, 1567, 1567],
  cogolin: [4633, 3750, 4147],
  colombes: [6744, 5213, 5882],
  colomiers: [2990, 1793, 2902],
  "combs-la-ville": [3115, 3113, 3113],
  comines: [2286, 2297, 2297],
  compiegne: [2797, 2714, 2732],
  concarneau: [2954, 2829, 2916],
  condom: [1094, 1087, 1087],
  "conflans-sainte-honorine": [4254, 4188, 4188],
  "corbeil-essonnes": [2914, 2461, 2694],
  "cormeilles-en-parisis": [4343, 4272, 4272],
  "cosne-cours-sur-loire": [1078, 1078, 1078],
  "coudekerque-branche": [1808, 1800, 1800],
  coueron: [3109, 3067, 3067],
  coulommiers: [2363, 2129, 2324],
  "coulounieix-chamiers": [1611, 1592, 1592],
  courbevoie: [9196, 7040, 7188],
  "cournon-d'auvergne": [2282, 2280, 2280],
  courrieres: [1748, 1738, 1738],
  coursan: [1822, 1613, 1613],
  coutances: [1769, 1714, 1714],
  coutras: [1566, 1538, 1538],
  couzeix: [1589, 1589, 1589],
  creil: [2261, 2111, 2156],
  "crepy-en-valois": [2668, 2536, 2536],
  crest: [2505, 2269, 2269],
  creteil: [5473, 4112, 4701],
  "criel-sur-mer": [2252, 2269, 2269],
  croix: [2468, 2468, 2468],
  crozon: [2250, 2115, 2115],
  cucq: [4031, 4031, 4031],
  cuers: [3462, 2357, 3207],
  cugnaux: [2741, 2710, 2710],
  cusset: [1420, 1414, 1414],
  "cuxac-d'aude": [1480, 1546, 1546],
  "dammarie-les-lys": [2792, 2633, 2633],
  "dammartin-en-goele": [2804, 2857, 2857],
  dax: [2429, 2320, 2364],
  deauville: [6222, 6187, 6190],
  "decines-charpieu": [3750, 3649, 3649],
  denain: [868, 866, 866],
  "deuil-la-barre": [4323, 4233, 4233],
  "deville-les-rouen": [2147, 2110, 2110],
  devoluy: [2400, 2375, 2400],
  die: [2114, 1909, 1909],
  dieppe: [2062, 2102, 2092],
  "digne-les-bains": [2369, 1634, 1875],
  dijon: [3065, 2956, 3000],
  dinan: [2785, 2477, 2703],
  dinard: [4735, 5267, 4983],
  dole: [1828, 1447, 1611],
  "dolus-d'oleron": [3302, 3519, 3519],
  domont: [3662, 3632, 3632],
  donges: [1970, 1970, 1970],
  douai: [1448, 1417, 1448],
  douarnenez: [2137, 2073, 2106],
  "doue-en-anjou": [1469, 1428, 1428],
  draguignan: [2897, 1690, 2031],
  drancy: [3625, 3323, 3500],
  draveil: [3533, 3505, 3505],
  dreux: [1956, 1846, 1846],
  dunkerque: [2013, 1926, 1998],
  eaubonne: [4350, 4277, 4277],
  echirolles: [3234, 1918, 2729],
  elancourt: [3125, 3132, 3132],
  elbeuf: [1732, 1294, 1294],
  elne: [2222, 2153, 2153],
  embrun: [3684, 3036, 3435],
  "entraigues-sur-la-sorgue": [2738, 2631, 2631],
  epernay: [2069, 1770, 1942],
  epinal: [1676, 1221, 1495],
  "epinay-sur-orge": [3627, 3625, 3625],
  eragny: [3422, 3380, 3380],
  "ergue-gaberic": [1813, 1813, 1813],
  ermont: [4221, 4247, 4247],
  erquy: [3026, 3045, 3045],
  "essey-les-nancy": [2207, 1407, 1892],
  estaires: [1890, 1869, 1869],
  etampes: [2542, 2317, 2434],
  etaples: [2218, 2233, 2233],
  eu: [1664, 1591, 1591],
  "evian-les-bains": [4217, 4000, 4217],
  evreux: [1884, 1824, 1880],
  evron: [1483, 1443, 1443],
  "evry-courcouronnes": [2857, 2905, 2860],
  eysines: [3537, 3495, 3495],
  "faches-thumesnil": [2450, 2450, 2450],
  falaise: [1786, 1710, 1710],
  fecamp: [2067, 1958, 2034],
  figeac: [1613, 1438, 1580],
  firminy: [1914, 1328, 1328],
  flers: [1124, 1094, 1094],
  fleurance: [1506, 1461, 1461],
  fleury: [3100, 3165, 3143],
  "fleury-les-aubrais": [2174, 2158, 2158],
  floirac: [3286, 3228, 3228],
  florensac: [2412, 2295, 2295],
  foix: [1433, 1421, 1421],
  fondettes: [2522, 2518, 2518],
  fonsorbes: [2790, 2755, 2755],
  fontaine: [3241, 2001, 2724],
  "fontaine-les-dijon": [3355, 3300, 3300],
  fontainebleau: [5386, 4682, 4801],
  "fontenay-le-comte": [1390, 1380, 1380],
  "fontenay-sous-bois": [6623, 5698, 6235],
  "fort-de-france": [1591, 1773, 1651],
  "fort-mahon-plage": [3571, 3605, 3576],
  "fos-sur-mer": [3243, 2291, 2902],
  fosses: [2805, 2800, 2800],
  fouesnant: [2811, 2833, 2833],
  fougeres: [1879, 1604, 1815],
  fouras: [3960, 3934, 3934],
  francheville: [3972, 3795, 3795],
  franconville: [3990, 3029, 3837],
  frejus: [3915, 3667, 3788],
  fresnes: [4785, 3095, 3441],
  frontignan: [3365, 3090, 3313],
  fuveau: [4333, 4000, 4000],
  gagny: [3590, 3592, 3592],
  gaillac: [1747, 1662, 1662],
  gap: [3106, 2288, 2756],
  gardanne: [3864, 3148, 3568],
  "gennes-val-de-loire": [1656, 1656, 1656],
  gerardmer: [2550, 2623, 2623],
  gerzat: [2231, 2205, 2205],
  gien: [1172, 1170, 1170],
  "gif-sur-yvette": [3970, 3984, 3984],
  gisors: [2298, 2303, 2303],
  givors: [2579, 2299, 2299],
  "gond-pontouvre": [1511, 1511, 1511],
  gonesse: [3212, 3182, 3182],
  goussainville: [3221, 3196, 3196],
  gouvieux: [3333, 3333, 3333],
  gradignan: [3491, 3426, 3426],
  granville: [3077, 3618, 3393],
  grasse: [4286, 2167, 2880],
  graulhet: [1207, 1200, 1200],
  gravelines: [2041, 2036, 2036],
  grenade: [2500, 2418, 2418],
  grenoble: [3372, 2821, 2855],
  "greoux-les-bains": [2941, 3061, 3000],
  grimaud: [6739, 5246, 5653],
  "grosseto-prugna": [4419, 5195, 5000],
  gruissan: [4802, 3418, 4336],
  guerande: [3258, 3226, 3226],
  gueret: [1065, 1038, 1038],
  guichen: [2345, 2345, 2345],
  guidel: [3333, 2128, 2549],
  guilers: [2088, 2088, 2088],
  guingamp: [1615, 2878, 1989],
  guipavas: [2366, 2366, 2366],
  "guipry-messac": [1528, 1506, 1506],
  "gujan-mestras": [4421, 4429, 4429],
  halluin: [2072, 1992, 1992],
  haubourdin: [2169, 2118, 2118],
  hautmont: [1034, 1033, 1033],
  hazebrouck: [1849, 1844, 1844],
  hem: [2775, 2694, 2694],
  hendaye: [4651, 4255, 4440],
  "henin-beaumont": [1400, 1395, 1395],
  hennebont: [2414, 2399, 2399],
  herbignac: [2381, 2381, 2381],
  "herblay-sur-seine": [3858, 3857, 3857],
  "herouville-saint-clair": [2529, 2555, 2555],
  hirson: [567, 569, 569],
  honfleur: [2612, 3414, 3023],
  houilles: [5238, 4868, 5130],
  houlgate: [3874, 4176, 4079],
  houplines: [2231, 2227, 2227],
  hourtin: [3272, 3248, 3248],
  huez: [6900, 6900, 6900],
  hyeres: [4512, 3360, 3811],
  ifs: [2685, 2674, 2674],
  igny: [4655, 4704, 4704],
  "ille-sur-tet": [1707, 1593, 1593],
  ingre: [2264, 2245, 2245],
  "inzinzac-lochrist": [2260, 2246, 2246],
  isbergues: [1308, 1306, 1306],
  isola: [4968, 5000, 4968],
  issoire: [2012, 1929, 1929],
  issoudun: [931, 910, 910],
  "issy-les-moulineaux": [8845, 7500, 7703],
  istres: [3086, 2315, 2981],
  "ivry-sur-seine": [6216, 5333, 5380],
  janze: [2418, 2395, 2395],
  "jard-sur-mer": [3395, 3350, 3350],
  "jaunay-marigny": [1656, 1632, 1632],
  joigny: [1242, 1196, 1196],
  "joinville-le-pont": [6896, 5178, 6167],
  "joue-les-tours": [2529, 2376, 2500],
  "jouy-le-moutier": [3117, 3114, 3114],
  juvignac: [3284, 3276, 3276],
  kourou: [2286, 2250, 2250],
  "l'aigle": [1383, 1379, 1379],
  "l'aiguillon-sur-mer": [2857, 2851, 2851],
  "l'hay-les-roses": [5000, 5000, 5000],
  "l'ile-d'yeu": [5120, 5160, 5160],
  "l'isle-adam": [3951, 3981, 3981],
  "l'isle-d'abeau": [2657, 2642, 2642],
  "l'isle-d'espagnac": [1651, 1651, 1651],
  "l'isle-jourdain": [2440, 2438, 2438],
  "l'isle-sur-la-sorgue": [3349, 3138, 3242],
  "l'union": [3043, 3000, 3000],
  "la baule-escoublac": [5429, 5598, 5499],
  "la bernerie-en-retz": [3890, 3917, 3917],
  "la bourboule": [1673, 1788, 1673],
  "la chapelle-d'armentieres": [2333, 2333, 2333],
  "la chapelle-saint-mesmin": [2165, 2168, 2168],
  "la chapelle-sur-erdre": [3246, 3246, 3246],
  "la ciotat": [5424, 4531, 4909],
  "la couronne": [1517, 1627, 1627],
  "la crau": [4067, 3347, 3851],
  "la fare-les-oliviers": [3907, 3816, 3816],
  "la farlede": [3737, 3685, 3685],
  "la ferte-bernard": [1500, 1496, 1496],
  "la ferte-sous-jouarre": [1950, 2082, 2082],
  "la fleche": [1611, 1500, 1500],
  "la garde": [4412, 3006, 3689],
  "la garenne-colombes": [7921, 6111, 6463],
  "la grande-motte": [5905, 4678, 4857],
  "la hague": [1913, 1923, 1923],
  "la londe-les-maures": [5102, 5625, 5177],
  "la madeleine": [3500, 2697, 3297],
  "la plagne tarentaise": [3667, 4712, 4480],
  "la plaine-sur-mer": [3857, 3857, 3857],
  "la possession": [3455, 3340, 3340],
  "la queue-en-brie": [3288, 3286, 3286],
  "la roche-sur-yon": [2338, 2500, 2360],
  "la rochelle": [4159, 5088, 4688],
  "la salle-les-alpes": [4286, 4226, 4286],
  "la seyne-sur-mer": [4235, 2583, 3311],
  "la teste-de-buch": [4592, 4556, 4556],
  "la tranche-sur-mer": [3908, 3838, 3838],
  "la tremblade": [3219, 3207, 3207],
  "la turballe": [3579, 3634, 3634],
  "la valette-du-var": [4095, 2558, 2846],
  lacanau: [5071, 5688, 5161],
  lagnieu: [2394, 2368, 2368],
  "lagny-sur-marne": [3740, 3924, 3800],
  lagord: [3624, 3556, 3556],
  "lamballe-armor": [2255, 2211, 2211],
  lambersart: [3507, 3500, 3500],
  lambesc: [3608, 3525, 3525],
  lamorlaye: [2923, 3000, 3000],
  landerneau: [2033, 2225, 2064],
  landivisiau: [1688, 1652, 1652],
  lanester: [2459, 2477, 2477],
  langon: [1936, 1923, 1923],
  langueux: [2133, 2141, 2141],
  languidic: [1845, 1845, 1845],
  lannion: [2062, 2028, 2028],
  lanton: [4203, 4198, 4198],
  laon: [1129, 1151, 1136],
  "larmor-plage": [4206, 4194, 4194],
  lattes: [4268, 4266, 4266],
  laval: [2095, 2148, 2108],
  lavaur: [1895, 1892, 1892],
  "le barcares": [3774, 3405, 3478],
  "le beausset": [4122, 3013, 3571],
  "le blanc-mesnil": [3554, 3506, 3506],
  "le boulou": [2353, 2154, 2154],
  "le bouscat": [4790, 4728, 4728],
  "le cannet": [5417, 3745, 4082],
  "le castellet": [4524, 4524, 4524],
  "le chateau-d'oleron": [3108, 3099, 3099],
  "le creusot": [1086, 1159, 1159],
  "le croisic": [4102, 3956, 3956],
  "le gosier": [2912, 3909, 3702],
  "le grand-quevilly": [2534, 2394, 2394],
  "le grau-du-roi": [4393, 4318, 4393],
  "le havre": [2362, 2090, 2249],
  "le lamentin": [2187, 2770, 2550],
  "le lavandou": [6384, 5191, 5505],
  "le luc": [2568, 1692, 2120],
  "le malesherbois": [1800, 1750, 1750],
  "le mans": [2101, 2308, 2126],
  "le mee-sur-seine": [2420, 2414, 2414],
  "le mene": [892, 889, 889],
  "le mesnil-esnard": [2750, 2712, 2712],
  "le moule": [2321, 2720, 2720],
  "le muy": [2857, 1880, 2146],
  "le passage": [1810, 1805, 1805],
  "le perreux-sur-marne": [6310, 5304, 5856],
  "le petit-quevilly": [1840, 1779, 1779],
  "le poire-sur-vie": [2200, 2217, 2217],
  "le pontet": [2271, 2212, 2212],
  "le port": [1947, 1965, 1965],
  "le portel": [1780, 1773, 1773],
  "le pouliguen": [4798, 4636, 4636],
  "le pradet": [5253, 3428, 4161],
  "le puy-en-velay": [1667, 1484, 1535],
  "le raincy": [4620, 3925, 4333],
  "le relecq-kerhuon": [2662, 2660, 2660],
  "le soler": [2337, 2326, 2326],
  "le taillan-medoc": [3395, 3400, 3400],
  "le tampon": [2214, 2358, 2237],
  "le teil": [1715, 1500, 1500],
  "le touquet-paris-plage": [8276, 7729, 7846],
  "le treport": [2074, 2520, 2317],
  "le vesinet": [6933, 6279, 6279],
  leers: [2608, 2608, 2608],
  "lege-cap-ferret": [9177, 9321, 9321],
  lempdes: [2295, 2253, 2253],
  lens: [1400, 1531, 1433],
  leognan: [3225, 3203, 3203],
  "les abymes": [1564, 1463, 1488],
  "les belleville": [4606, 7132, 6875],
  "les clayes-sous-bois": [3810, 3824, 3824],
  "les deux alpes": [4814, 4974, 4814],
  "les hauts-d'anjou": [1570, 1544, 1544],
  "les herbiers": [2234, 2235, 2235],
  "les lilas": [6975, 6750, 6975],
  "les mathes": [3822, 3812, 3812],
  "les mureaux": [2751, 2722, 2722],
  "les pavillons-sous-bois": [3640, 3149, 3500],
  "les pennes-mirabeau": [3977, 3800, 3800],
  "les sables-d'olonne": [3772, 4436, 3862],
  "les trois-ilets": [4569, 4658, 4569],
  lesigny: [2747, 2787, 2787],
  lesneven: [1815, 1815, 1815],
  lesquin: [2919, 2903, 2903],
  leucate: [3746, 3516, 3669],
  "levallois-perret": [8846, 8833, 8846],
  "lezignan-corbieres": [1671, 1565, 1565],
  libourne: [2488, 2056, 2273],
  lievin: [1577, 1578, 1578],
  liffre: [2811, 2811, 2811],
  lille: [2719, 3974, 3425],
  lillebonne: [1429, 1429, 1429],
  lillers: [1034, 1034, 1034],
  limay: [2566, 2549, 2549],
  "limeil-brevannes": [3589, 3588, 3588],
  limoges: [1834, 1479, 1686],
  limoux: [1429, 1305, 1305],
  linas: [3163, 3172, 3172],
  linselles: [2781, 2781, 2781],
  lisieux: [1800, 1905, 1828],
  "livron-sur-drome": [2173, 2123, 2123],
  "livry-gargan": [3548, 3257, 3460],
  lodeve: [1392, 1094, 1191],
  "loire-authion": [2113, 2116, 2116],
  "longeville-sur-mer": [3084, 3071, 3071],
  longjumeau: [3461, 3375, 3375],
  longuenesse: [1587, 1606, 1606],
  longwy: [1941, 1929, 1929],
  lons: [2360, 2296, 2296],
  "lons-le-saunier": [1689, 1453, 1607],
  loos: [2273, 2735, 2301],
  lorgues: [2273, 2061, 2179],
  lorient: [2897, 2783, 2871],
  lormont: [3030, 2875, 2875],
  loudeac: [1393, 1392, 1392],
  loudun: [1085, 1068, 1068],
  louhans: [1588, 1559, 1559],
  lourdes: [1500, 997, 1112],
  louviers: [1886, 1870, 1870],
  luce: [2127, 2137, 2137],
  lucon: [1875, 1824, 1824],
  lunel: [3000, 1866, 2765],
  luneville: [1530, 901, 1321],
  "lyon 1er arrondissement": [4883, 4870, 4883],
  "lyon 2e arrondissement": [5354, 5354, 5354],
  "lyon 3e arrondissement": [4750, 4692, 4750],
  "lyon 4e arrondissement": [5072, 5000, 5072],
  "lyon 5e arrondissement": [4538, 4500, 4538],
  "lyon 6e arrondissement": [5293, 5307, 5293],
  "lyon 7e arrondissement": [4545, 4545, 4545],
  "lyon 8e arrondissement": [4274, 4526, 4455],
  "lyon 9e arrondissement": [4038, 4000, 4038],
  "lys-lez-lannoy": [2296, 2270, 2270],
  macon: [2198, 1515, 1802],
  "maisons-alfort": [6302, 5677, 5950],
  "maisons-laffitte": [7658, 7238, 7238],
  malakoff: [7687, 6634, 6850],
  malemort: [1721, 1719, 1719],
  mallemort: [3333, 3301, 3301],
  mamers: [973, 972, 972],
  "mandelieu-la-napoule": [5291, 4394, 4514],
  manosque: [2704, 1471, 2274],
  "mantes-la-jolie": [2644, 2517, 2600],
  "mantes-la-ville": [2446, 2458, 2458],
  marck: [2039, 2039, 2039],
  "marcq-en-barœul": [4044, 3158, 3938],
  "marennes-hiers-brouage": [2356, 2329, 2329],
  "margny-les-compiegne": [2513, 2500, 2500],
  marguerittes: [2546, 2511, 2511],
  marignane: [3677, 2800, 3467],
  marly: [1427, 1421, 1421],
  marmande: [1422, 1377, 1377],
  "marquette-lez-lille": [3261, 3258, 3258],
  marseillan: [3642, 3922, 3730],
  "marseille 10e arrondissement": [4364, 2708, 2857],
  "marseille 11e arrondissement": [4175, 2814, 3571],
  "marseille 12e arrondissement": [5161, 3193, 4507],
  "marseille 13e arrondissement": [3810, 2457, 3247],
  "marseille 14e arrondissement": [2950, 1167, 1511],
  "marseille 15e arrondissement": [2866, 1333, 2037],
  "marseille 16e arrondissement": [3419, 2413, 2976],
  "marseille 1er arrondissement": [2962, 2962, 2962],
  "marseille 2e arrondissement": [2981, 3000, 2981],
  "marseille 3e arrondissement": [1632, 1620, 1632],
  "marseille 4e arrondissement": [3707, 2785, 2828],
  "marseille 5e arrondissement": [3471, 3455, 3471],
  "marseille 6e arrondissement": [3634, 3600, 3634],
  "marseille 7e arrondissement": [7679, 4583, 4850],
  "marseille 8e arrondissement": [6682, 4062, 4350],
  "marseille 9e arrondissement": [5157, 3512, 3956],
  marsillargues: [2728, 2680, 2680],
  martigues: [3614, 2558, 3019],
  massy: [4494, 4474, 4474],
  maubeuge: [1000, 1043, 1043],
  "mauges-sur-loire": [1626, 1605, 1605],
  mauguio: [4091, 4308, 4189],
  mauleon: [1402, 1402, 1402],
  maurepas: [3060, 3060, 3060],
  mayenne: [1549, 1539, 1539],
  mazamet: [1042, 1021, 1021],
  meaux: [2798, 3108, 2918],
  "mehun-sur-yevre": [1170, 1136, 1136],
  melun: [2867, 2885, 2867],
  mennecy: [2995, 2995, 2995],
  menton: [5345, 4688, 4698],
  merignac: [3882, 3011, 3740],
  merlimont: [3200, 3378, 3378],
  meru: [2511, 2484, 2484],
  merville: [1669, 1653, 1653],
  "meschers-sur-gironde": [3301, 3319, 3319],
  meudon: [8205, 5636, 6991],
  meyzieu: [3736, 3714, 3714],
  meze: [3307, 2978, 3261],
  "mezidon vallee d'auge": [1654, 1638, 1638],
  millau: [2000, 1493, 1812],
  mimizan: [3111, 3632, 3217],
  mions: [3846, 3829, 3829],
  mios: [3368, 3433, 3433],
  miramas: [2937, 2013, 2686],
  "mitry-mory": [3333, 3333, 3333],
  "moelan-sur-mer": [2444, 2451, 2451],
  moissac: [1182, 1167, 1167],
  "moissy-cramayel": [3056, 3067, 3067],
  "moliets-et-maa": [5333, 4267, 4402],
  mondeville: [2533, 2513, 2513],
  "mons-en-barœul": [2825, 1613, 2421],
  "mont-de-marsan": [1987, 1915, 1977],
  "mont-saint-aignan": [3044, 2891, 2891],
  "montaigu-vendee": [2244, 2244, 2244],
  montargis: [1308, 1532, 1468],
  montataire: [2290, 2135, 2135],
  montauban: [1964, 1815, 1902],
  montbeliard: [1375, 953, 1263],
  montbrison: [2060, 1664, 1971],
  "montceau-les-mines": [920, 894, 894],
  montelimar: [2285, 1444, 2037],
  montesson: [5163, 5083, 5083],
  monteux: [2444, 2420, 2420],
  montfermeil: [3370, 3282, 3282],
  montgeron: [3698, 3750, 3750],
  "montigny-le-bretonneux": [4426, 4436, 4436],
  "montigny-les-cormeilles": [3581, 3571, 3571],
  montivilliers: [2250, 2216, 2216],
  "montlouis-sur-loire": [2436, 2429, 2429],
  montlucon: [1036, 1017, 1017],
  montmorency: [4300, 4153, 4219],
  montpellier: [3675, 3600, 3611],
  "montpon-menesterol": [1053, 1053, 1053],
  montreuil: [5870, 6304, 6114],
  "montrevault-sur-evre": [1448, 1446, 1446],
  montrouge: [7143, 7059, 7143],
  morangis: [3868, 3850, 3850],
  "moret-loing-et-orvanne": [2619, 2595, 2595],
  morlaix: [1663, 1535, 1633],
  "morsang-sur-orge": [3526, 3500, 3500],
  morzine: [7857, 7960, 7857],
  mougins: [4972, 4759, 4759],
  moulins: [1306, 938, 1188],
  mouvaux: [3267, 3264, 3264],
  muret: [2556, 1993, 2409],
  muzillac: [2587, 2496, 2496],
  nancy: [2537, 2370, 2394],
  nanterre: [5970, 5159, 5526],
  nantes: [4077, 3684, 3824],
  narbonne: [2500, 1953, 2204],
  nemours: [2000, 1978, 1988],
  nerac: [1264, 1200, 1200],
  "neufchatel-hardelot": [2478, 2608, 2608],
  "neuilly-plaisance": [4355, 4298, 4298],
  "neuilly-sur-seine": [10083, 10000, 10083],
  "neuville-en-ferrain": [2680, 2679, 2679],
  nevers: [1189, 1093, 1154],
  nice: [5510, 4908, 4929],
  nieppe: [2302, 2292, 2292],
  nimes: [2445, 2192, 2308],
  niort: [1936, 1551, 1883],
  "nogent-le-rotrou": [1371, 1338, 1338],
  "nogent-sur-marne": [7733, 6023, 6463],
  "nogent-sur-oise": [2154, 2083, 2083],
  "noirmoutier-en-l'ile": [5155, 5061, 5061],
  "noisy-le-grand": [4444, 4300, 4385],
  "noisy-le-sec": [4245, 3886, 4124],
  "nort-sur-erdre": [2600, 2644, 2644],
  noyon: [1392, 1350, 1350],
  oissel: [1835, 1819, 1819],
  olivet: [2547, 3062, 2735],
  ollioules: [4222, 2683, 3239],
  "oloron-sainte-marie": [1495, 1445, 1445],
  "ombree d'anjou": [1091, 1096, 1096],
  "onet-le-chateau": [1900, 1875, 1875],
  orange: [2366, 2036, 2297],
  orchies: [2225, 2217, 2217],
  "oree d'anjou": [2059, 2039, 2039],
  orgeval: [4259, 4219, 4219],
  orleans: [2423, 2880, 2600],
  "ormesson-sur-marne": [3929, 3934, 3934],
  orsay: [4184, 4286, 4286],
  orthez: [1408, 1422, 1422],
  orvault: [3358, 3364, 3364],
  osny: [3301, 3312, 3312],
  ouistreham: [3179, 3204, 3204],
  oullins: [4000, 3463, 3736],
  outreau: [1700, 1684, 1684],
  oyonnax: [1948, 1785, 1785],
  "ozoir-la-ferriere": [3317, 3333, 3333],
  pace: [3156, 3144, 3144],
  paimpol: [3077, 3119, 3119],
  palaiseau: [4426, 4477, 4477],
  "palavas-les-flots": [4991, 4500, 4626],
  pamiers: [1530, 1069, 1400],
  panazol: [1800, 1800, 1800],
  pantin: [6207, 6111, 6207],
  "paray-le-monial": [1429, 1511, 1511],
  "parentis-en-born": [3228, 3134, 3134],
  "paris 10e arrondissement": [9231, 9231, 9231],
  "paris 11e arrondissement": [9800, 9800, 9800],
  "paris 12e arrondissement": [8947, 8938, 8947],
  "paris 13e arrondissement": [8824, 8781, 8824],
  "paris 14e arrondissement": [9362, 9333, 9362],
  "paris 15e arrondissement": [9425, 9423, 9425],
  "paris 16e arrondissement": [10526, 10500, 10526],
  "paris 17e arrondissement": [9749, 9744, 9749],
  "paris 18e arrondissement": [8750, 8750, 8750],
  "paris 19e arrondissement": [8130, 8105, 8130],
  "paris 1er arrondissement": [11816, 11816, 11816],
  "paris 20e arrondissement": [8403, 8380, 8403],
  "paris 2e arrondissement": [10846, 10846, 10846],
  "paris 3e arrondissement": [11429, 11429, 11429],
  "paris 4e arrondissement": [12378, 12378, 12378],
  "paris 5e arrondissement": [11620, 11620, 11620],
  "paris 6e arrondissement": [13571, 13571, 13571],
  "paris 7e arrondissement": [12892, 12889, 12892],
  "paris 8e arrondissement": [11402, 11370, 11402],
  "paris 9e arrondissement": [10526, 10526, 10526],
  parthenay: [1212, 1200, 1200],
  pau: [2410, 2092, 2212],
  pelissanne: [3562, 3463, 3463],
  penmarch: [2353, 2353, 2353],
  perenchies: [2669, 2518, 2518],
  perigueux: [1757, 1731, 1738],
  "pernes-les-fontaines": [2899, 2794, 2794],
  perols: [4397, 4201, 4201],
  perpignan: [2041, 1438, 1800],
  "perros-guirec": [3258, 3256, 3256],
  pertuis: [3252, 2575, 3078],
  pessac: [3694, 3339, 3681],
  "petit-bourg": [2706, 2706, 2706],
  "petit-caux": [1600, 1600, 1600],
  "petite-ile": [2360, 2353, 2353],
  peymeinade: [3571, 2587, 2826],
  pezenas: [2374, 1795, 2063],
  pia: [2584, 2547, 2547],
  pierrelatte: [2072, 2045, 2045],
  pignan: [3448, 3448, 3448],
  pignans: [2792, 2154, 2154],
  "plaisance-du-touch": [2986, 2967, 2967],
  plaisir: [3430, 3400, 3400],
  "pleneuf-val-andre": [3551, 3712, 3712],
  plerin: [2481, 2535, 2535],
  ploemeur: [3516, 3536, 3536],
  ploermel: [1900, 1876, 1876],
  ploufragan: [2042, 2042, 2042],
  "plougastel-daoulas": [2068, 2068, 2068],
  plouzane: [2254, 2281, 2281],
  pluvigner: [2182, 2182, 2182],
  "pointe-a-pitre": [1232, 1255, 1232],
  poissy: [4377, 3850, 4228],
  poitiers: [1975, 2365, 2097],
  pollestres: [2244, 2152, 2152],
  "pont-a-mousson": [1667, 1338, 1504],
  "pont-audemer": [1806, 1733, 1733],
  "pont-du-chateau": [2110, 2106, 2106],
  "pont-l'abbe": [2239, 2193, 2204],
  "pont-saint-esprit": [1942, 1853, 1853],
  "pont-sainte-maxence": [2214, 2164, 2164],
  pontarlier: [3182, 2432, 2821],
  "pontault-combault": [3602, 3627, 3627],
  pontchateau: [2236, 2212, 2212],
  pontivy: [1606, 1602, 1602],
  pontoise: [3219, 3408, 3285],
  pornic: [4268, 4312, 4312],
  pornichet: [4674, 4896, 4896],
  "port-de-bouc": [3091, 2780, 2780],
  "port-jerome-sur-seine": [1699, 1675, 1675],
  "port-la-nouvelle": [2859, 2213, 2459],
  "portet-sur-garonne": [2843, 2845, 2845],
  portiragnes: [3560, 3436, 3436],
  "porto-vecchio": [5278, 5000, 5085],
  prades: [1709, 1638, 1638],
  provins: [1767, 1786, 1786],
  "puget-sur-argens": [3943, 2900, 3302],
  puteaux: [7084, 7034, 7084],
  "puy-saint-vincent": [2560, 2557, 2560],
  questembert: [2278, 2252, 2252],
  queven: [2567, 2579, 2579],
  quiberon: [4922, 4815, 4815],
  quillan: [1176, 1150, 1150],
  quimper: [2177, 2155, 2167],
  quimperle: [2065, 2038, 2038],
  raismes: [1355, 1323, 1323],
  rambouillet: [3650, 4105, 3689],
  "ramonville-saint-agne": [3154, 3154, 3154],
  redon: [1990, 1942, 1942],
  reims: [2472, 2853, 2688],
  "remire-montjoly": [2899, 3167, 2950],
  rennes: [4500, 4333, 4415],
  revel: [1790, 1750, 1750],
  revin: [851, 837, 837],
  reze: [3333, 2431, 3239],
  "rillieux-la-pape": [3786, 3614, 3614],
  riom: [2148, 1525, 1867],
  riorges: [1875, 1823, 1823],
  "ris-orangis": [3190, 3027, 3027],
  risoul: [3929, 3903, 3929],
  rivesaltes: [2019, 1875, 1875],
  roanne: [1684, 1203, 1471],
  rochefort: [2282, 2333, 2290],
  rodez: [2036, 1944, 1983],
  rognac: [3637, 3629, 3629],
  "roissy-en-brie": [3365, 3333, 3333],
  romagnat: [2225, 2219, 2219],
  romainville: [5613, 5375, 5419],
  "romans-sur-isere": [2195, 1389, 1966],
  "romilly-sur-seine": [1178, 1106, 1106],
  "romorantin-lanthenay": [1250, 1244, 1244],
  ronchin: [2324, 2333, 2333],
  roncq: [2559, 2574, 2574],
  "roquebrune-cap-martin": [5910, 5312, 5338],
  "roquebrune-sur-argens": [3760, 4278, 3845],
  "rosny-sous-bois": [4591, 4118, 4352],
  rosporden: [1683, 1675, 1675],
  roubaix: [1252, 1526, 1320],
  rouen: [2578, 2894, 2840],
  royan: [3494, 3703, 3558],
  "rueil-malmaison": [7606, 5425, 6900],
  "ruelle-sur-touvre": [1588, 1588, 1588],
  rumilly: [3523, 2775, 3244],
  "sable-sur-sarthe": [1332, 1307, 1307],
  "saint-affrique": [1545, 1432, 1432],
  "saint-amand-les-eaux": [1613, 1614, 1614],
  "saint-amand-montrond": [974, 957, 957],
  "saint-andre": [2040, 2013, 2013],
  "saint-andre-de-cubzac": [2410, 2344, 2344],
  "saint-andre-les-vergers": [1962, 1943, 1943],
  "saint-andre-lez-lille": [3478, 3435, 3435],
  "saint-arnoult-en-yvelines": [2965, 2908, 2908],
  "saint-ave": [3106, 3125, 3125],
  "saint-avertin": [2653, 2663, 2663],
  "saint-benoit": [1816, 1854, 1854],
  "saint-berthevin": [2083, 2083, 2083],
  "saint-brevin-les-pins": [3554, 3571, 3571],
  "saint-brieuc": [1924, 1812, 1895],
  "saint-chamas": [3295, 2970, 2970],
  "saint-chamond": [2308, 1050, 1957],
  "saint-cyprien": [3448, 3925, 3632],
  "saint-cyr-sur-loire": [3030, 3026, 3026],
  "saint-cyr-sur-mer": [6107, 5533, 5750],
  "saint-denis": [3158, 3340, 3312],
  "saint-die-des-vosges": [1216, 1130, 1130],
  "saint-dizier": [1252, 1244, 1244],
  "saint-doulchard": [1625, 1633, 1633],
  "saint-esteve": [2342, 2341, 2341],
  "saint-etienne": [2000, 1273, 1425],
  "saint-etienne-du-rouvray": [2054, 2050, 2050],
  "saint-fargeau-ponthierry": [2732, 2697, 2697],
  "saint-francois": [3486, 5042, 4765],
  "saint-gaudens": [1330, 1219, 1219],
  "saint-genis-laval": [4448, 4435, 4435],
  "saint-georges-d'oleron": [3472, 3412, 3412],
  "saint-georges-de-didonne": [3600, 3704, 3704],
  "saint-germain-en-laye": [6549, 6406, 6406],
  "saint-germain-les-corbeil": [3228, 3231, 3231],
  "saint-gervais-les-bains": [6600, 4994, 5369],
  "saint-gilles": [2129, 2088, 2088],
  "saint-gilles-croix-de-vie": [3977, 3942, 3942],
  "saint-girons": [1376, 1276, 1276],
  "saint-herblain": [3131, 2405, 3048],
  "saint-hilaire-de-riez": [3507, 2615, 3389],
  "saint-hilaire-du-harcouet": [1159, 1161, 1161],
  "saint-jean": [2883, 2881, 2881],
  "saint-jean-d'angely": [1349, 1333, 1333],
  "saint-jean-de-braye": [2202, 2195, 2195],
  "saint-jean-de-la-ruelle": [1910, 1910, 1910],
  "saint-jean-de-luz": [5405, 5888, 5807],
  "saint-jean-de-monts": [3057, 3322, 3141],
  "saint-jean-de-vedas": [4103, 4029, 4029],
  "saint-joseph": [2062, 2000, 2000],
  "saint-junien": [1231, 1205, 1205],
  "saint-just-saint-rambert": [2281, 2187, 2187],
  "saint-laurent-de-la-salanque": [2370, 2256, 2256],
  "saint-laurent-du-var": [4571, 4296, 4471],
  "saint-leu": [3531, 3561, 3561],
  "saint-leu-la-foret": [3918, 3897, 3897],
  "saint-lo": [1654, 1652, 1652],
  "saint-louis": [2222, 2195, 2195],
  "saint-lys": [2403, 2403, 2403],
  "saint-maixent-l'ecole": [1296, 1279, 1279],
  "saint-malo": [4359, 4519, 4432],
  "saint-martin": [3810, 3759, 3810],
  "saint-martin-boulogne": [1855, 1848, 1848],
  "saint-martin-d'heres": [3359, 2813, 3000],
  "saint-martin-de-crau": [2929, 2818, 2818],
  "saint-maur-des-fosses": [6818, 5317, 6321],
  "saint-maximin-la-sainte-baume": [2606, 2583, 2583],
  "saint-medard-en-jalles": [3603, 3587, 3587],
  "saint-michel-chef-chef": [3821, 3802, 3802],
  "saint-michel-sur-orge": [3180, 3131, 3131],
  "saint-nazaire": [2829, 2750, 2789],
  "saint-nicolas-de-port": [1881, 1742, 1742],
  "saint-omer": [1422, 1368, 1390],
  "saint-orens-de-gameville": [3128, 3113, 3113],
  "saint-ouen-l'aumone": [3316, 3182, 3182],
  "saint-ouen-sur-seine": [6588, 6578, 6588],
  "saint-pair-sur-mer": [3450, 3410, 3410],
  "saint-palais-sur-mer": [4429, 4500, 4500],
  "saint-paul": [3293, 5339, 3491],
  "saint-paul-les-dax": [2651, 2630, 2630],
  "saint-philbert-de-grand-lieu": [2600, 2600, 2600],
  "saint-pierre": [3030, 3158, 3037],
  "saint-pierre-d'oleron": [3406, 3429, 3429],
  "saint-pierre-des-corps": [2387, 2354, 2354],
  "saint-pierre-du-perray": [3218, 3185, 3185],
  "saint-pierre-en-auge": [1274, 1247, 1247],
  "saint-pierre-les-elbeuf": [1878, 1878, 1878],
  "saint-pol-de-leon": [1985, 1880, 1880],
  "saint-priest": [3721, 3113, 3500],
  "saint-quentin": [1028, 1086, 1042],
  "saint-raphael": [4552, 5119, 4957],
  "saint-remy-de-provence": [4521, 4355, 4355],
  "saint-renan": [2532, 2388, 2388],
  "saint-saulve": [1828, 1795, 1795],
  "saint-sebastien-sur-loire": [3485, 3467, 3467],
  "saint-sulpice-la-pointe": [2526, 2505, 2505],
  "saint-tropez": [12692, 12446, 12692],
  "saint-yrieix-la-perche": [1136, 1133, 1133],
  "saint-yrieix-sur-charente": [1695, 1689, 1689],
  "sainte-anne": [2877, 3113, 3113],
  "sainte-genevieve-des-bois": [3434, 3368, 3368],
  "sainte-livrade-sur-lot": [952, 950, 950],
  "sainte-luce-sur-loire": [3309, 3318, 3318],
  "sainte-marie": [2525, 2464, 2464],
  "sainte-marie-de-re": [6009, 6009, 6009],
  "sainte-marie-la-mer": [3415, 3385, 3385],
  "sainte-maxime": [5967, 5378, 5419],
  "sainte-savine": [2101, 1677, 1900],
  saintes: [1967, 1872, 1944],
  sallanches: [4500, 3904, 3904],
  "salon-de-provence": [3640, 2778, 3306],
  "san-nicolao": [3096, 3096, 3096],
  "sanary-sur-mer": [5130, 5786, 5635],
  sannois: [4315, 4015, 4015],
  saran: [2262, 2258, 2258],
  sarcelles: [2962, 2900, 2900],
  "sarlat-la-caneda": [1629, 1753, 1753],
  sartrouville: [5133, 4576, 5034],
  sarzeau: [3908, 3900, 3900],
  saujon: [2619, 2593, 2593],
  saumur: [1824, 1628, 1772],
  "sausset-les-pins": [6413, 6506, 6506],
  sautron: [3230, 3209, 3209],
  savenay: [2761, 2706, 2706],
  "savigny-le-temple": [2831, 2828, 2828],
  "savigny-sur-orge": [3819, 3769, 3769],
  sceaux: [7506, 6548, 6800],
  schœlcher: [2889, 2381, 2690],
  seclin: [2286, 2273, 2273],
  sedan: [1083, 735, 824],
  "segre-en-anjou bleu": [1474, 1479, 1479],
  seignosse: [6658, 6294, 6294],
  sene: [3754, 3750, 3750],
  senlis: [3386, 3658, 3453],
  sens: [1829, 1600, 1761],
  "septemes-les-vallons": [3427, 3286, 3286],
  serignan: [2769, 2750, 2750],
  servian: [2125, 2097, 2097],
  sete: [3904, 2962, 3156],
  sevran: [3221, 2357, 3041],
  sevremoine: [1846, 1832, 1832],
  sigean: [2043, 2000, 2000],
  "sin-le-noble": [1377, 1340, 1340],
  sisteron: [2426, 1855, 1855],
  "six-fours-les-plages": [4955, 5114, 5000],
  soissons: [1623, 1562, 1600],
  "soisy-sous-montmorency": [4186, 4091, 4091],
  "sollies-pont": [3773, 2453, 3322],
  somain: [1287, 1286, 1286],
  sorgues: [2577, 2447, 2447],
  "sotteville-les-rouen": [2107, 2083, 2083],
  "soulac-sur-mer": [3698, 3698, 3698],
  soustons: [4081, 4151, 4151],
  soyaux: [1515, 1515, 1515],
  "sucy-en-brie": [4068, 4029, 4029],
  suresnes: [8390, 6435, 7107],
  surgeres: [1979, 1987, 1987],
  talence: [4246, 3943, 4109],
  "talmont-saint-hilaire": [3077, 3750, 3213],
  tarare: [1972, 1586, 1690],
  tarascon: [2062, 1714, 1887],
  tarbes: [1643, 1410, 1517],
  tarnos: [4021, 4000, 4000],
  taverny: [3989, 3930, 3930],
  "templeuve-en-pevele": [2641, 2630, 2630],
  "terrasson-lavilledieu": [1315, 1297, 1297],
  "teteghem-coudekerque-village": [2463, 2463, 2463],
  thiais: [4350, 4355, 4355],
  thiers: [776, 776, 776],
  "thonon-les-bains": [4125, 3261, 3878],
  "thorigny-sur-marne": [3462, 3462, 3462],
  "thouare-sur-loire": [3250, 3231, 3231],
  thouars: [1140, 1132, 1132],
  thuir: [2395, 2330, 2330],
  tomblaine: [2373, 2354, 2354],
  "tonnay-charente": [2259, 2244, 2244],
  tonneins: [946, 956, 956],
  torreilles: [2976, 2976, 2976],
  toul: [1730, 1442, 1442],
  toulon: [4222, 2587, 2883],
  toulouges: [2130, 2125, 2125],
  toulouse: [3500, 4031, 3857],
  tourcoing: [1736, 1572, 1731],
  tournefeuille: [3193, 3189, 3189],
  "tournon-sur-rhone": [2277, 1550, 2053],
  tours: [3141, 3000, 3056],
  trebes: [1403, 1375, 1375],
  tregueux: [2057, 2068, 2068],
  tregunc: [2540, 2519, 2519],
  treillieres: [3070, 3070, 3070],
  trelaze: [2445, 2440, 2440],
  trelissac: [1605, 1600, 1600],
  "tremblay-en-france": [3353, 3300, 3300],
  trets: [3436, 3065, 3226],
  "triel-sur-seine": [3381, 3345, 3345],
  "trouville-sur-mer": [4932, 5249, 5099],
  troyes: [1756, 1854, 1820],
  tulle: [971, 909, 909],
  uzes: [3191, 3295, 3202],
  "val de briey": [1834, 1545, 1545],
  valbonne: [5494, 4337, 4580],
  valence: [2347, 2160, 2266],
  valenciennes: [1601, 1842, 1673],
  vallauris: [4664, 3732, 4067],
  vallet: [2529, 2531, 2531],
  "valras-plage": [3511, 3192, 3259],
  valreas: [1689, 1602, 1602],
  valserhone: [3101, 2800, 2800],
  "vandœuvre-les-nancy": [2165, 2174, 2174],
  vannes: [3952, 4055, 4000],
  vanves: [6769, 6614, 6769],
  "vaulx-en-velin": [3229, 3086, 3086],
  vaureal: [3464, 3500, 3500],
  vauvert: [2488, 2442, 2442],
  "vaux-le-penil": [2779, 2779, 2779],
  "vaux-sur-mer": [4049, 4167, 4167],
  vedene: [2695, 2620, 2620],
  vence: [4444, 3625, 3786],
  vendome: [1643, 1656, 1656],
  venissieux: [3269, 2900, 3168],
  verdun: [1405, 1119, 1253],
  "verneuil-sur-seine": [3803, 3763, 3763],
  vernon: [2393, 2602, 2434],
  vernouillet: [1981, 2010, 2010],
  "verrieres-le-buisson": [5057, 5030, 5030],
  versailles: [8818, 6955, 7200],
  "vert-saint-denis": [2943, 2938, 2938],
  vertou: [3266, 3258, 3258],
  vesoul: [1469, 1156, 1301],
  vias: [2734, 2542, 2542],
  vichy: [1828, 2037, 1912],
  vidauban: [2725, 2085, 2377],
  vienne: [2922, 2107, 2410],
  vierzon: [901, 880, 880],
  "vigneux-sur-seine": [3412, 3347, 3347],
  "villard-de-lans": [3587, 3323, 3587],
  villecresnes: [3636, 3645, 3645],
  villefontaine: [2444, 2413, 2413],
  "villefranche-de-rouergue": [862, 865, 865],
  "villefranche-sur-mer": [7456, 7143, 7456],
  "villefranche-sur-saone": [2867, 2111, 2451],
  villejuif: [5550, 5328, 5394],
  villemomble: [4127, 3753, 4000],
  "villenave-d'ornon": [3507, 3488, 3488],
  "villeneuve-d'ascq": [3000, 2386, 2927],
  "villeneuve-le-roi": [3777, 3727, 3727],
  "villeneuve-les-avignon": [3371, 3365, 3365],
  "villeneuve-loubet": [5400, 5589, 5465],
  "villeneuve-saint-georges": [3202, 3039, 3039],
  "villeneuve-sur-lot": [1234, 887, 1189],
  "villeneuve-tolosane": [2752, 2713, 2713],
  villeparisis: [3378, 3335, 3335],
  villepinte: [3141, 2166, 2745],
  villepreux: [3776, 3758, 3758],
  "villers-les-nancy": [2333, 2333, 2333],
  "villers-sur-mer": [4265, 4265, 4265],
  villerupt: [2580, 2489, 2489],
  villeurbanne: [4122, 3917, 3944],
  "villiers-sur-marne": [4265, 3836, 4017],
  vincennes: [10795, 8562, 8643],
  "vire normandie": [1212, 1273, 1273],
  viroflay: [7675, 6959, 6959],
  "viry-chatillon": [3625, 3509, 3509],
  vitre: [2531, 2513, 2513],
  vitrolles: [3762, 2431, 3388],
  "vitry-sur-seine": [4740, 4259, 4590],
  vittel: [1320, 1340, 1335],
  voiron: [3118, 2151, 2472],
  "voisins-le-bretonneux": [4410, 4424, 4424],
  voreppe: [2947, 2807, 2807],
  wambrechies: [3391, 3391, 3391],
  wasquehal: [3205, 3205, 3205],
  wattignies: [2448, 2429, 2429],
  wattrelos: [1860, 1823, 1823],
  wavrin: [2526, 2526, 2526],
  wimereux: [3442, 3712, 3712],
  yerres: [3773, 3756, 3756],
  yvetot: [2033, 2013, 2013],
  yzeure: [1545, 1527, 1527],
};

const TENSION_DEPT: Record<string, "faible" | "moderee" | "forte"> = {
  "75": "forte",
  "92": "forte",
  "69": "forte",
  "33": "forte",
  "06": "forte",
  "13": "moderee",
  "31": "moderee",
  "44": "moderee",
  "59": "moderee",
  "67": "moderee",
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Colonne de PRIX_DEPT à retenir : une maison et un appartement du même
 *  département ne valent pas le même prix au m² — 17 % d'écart médian, jusqu'à
 *  65 % dans la Vienne. Les autres types de biens prennent la valeur tous
 *  types confondus, qui leur sert de simple référence résidentielle. */
function colonnePrix(type: string | null): 0 | 1 | 2 {
  return type === "maison" ? 0 : type === "appartement" ? 1 : 2;
}

/** Département retenu pour un bien, en tenant compte des DOM (code à trois
 *  chiffres) et de la Corse (20xxx, sans distinction 2A/2B au code postal). */
function deptDe(form: LeenkeyForm): string {
  const source = (form.departement || form.code_postal || "").trim();
  if (PRIX_DEPT[source.slice(0, 3)]) return source.slice(0, 3);
  if (source.startsWith("20")) return "2A";
  return source.slice(0, 2);
}

function basePrixM2(form: LeenkeyForm): number {
  const col = colonnePrix(form.type);
  const dept = PRIX_DEPT[deptDe(form)];

  // Rapport maison/appartement du département, appliqué aux références plus
  // fines : la commune et l'arrondissement sont mesurés tous types confondus,
  // faute de volume suffisant pour les scinder.
  const ratio = dept && dept[2] > 0 ? dept[col] / dept[2] : 1;

  const cp = (form.code_postal || "").trim();
  if (PRIX_PARIS[cp]) return Math.round(PRIX_PARIS[cp] * ratio);
  // La commune est mesurée par type quand le volume le permet : y appliquer le
  // ratio départemental gonflait l'estimation, une médiane communale étant déjà
  // dominée par les appartements en ville.
  const v = normalize(form.ville || "");
  if (v && PRIX_VILLE[v]) return PRIX_VILLE[v][col];
  return dept ? dept[col] : PRIX_DEPT_DEFAUT;
}

function tension(form: LeenkeyForm): "faible" | "moderee" | "forte" {
  const dept = (form.departement || form.code_postal || "").slice(0, 2);
  const connue = TENSION_DEPT[dept];
  if (connue) return connue;
  // La table ne couvre que 10 départements sur 101 : partout ailleurs elle
  // renvoyait "faible", y compris à Rennes, Montpellier ou Annecy. À défaut,
  // le niveau de prix est le meilleur indicateur disponible — un marché cher
  // est un marché où la demande excède l'offre.
  const prix = basePrixM2(form);
  if (prix >= 5000) return "forte";
  if (prix >= 3300) return "moderee";
  return "faible";
}

/**
 * Largeur de la fourchette, indexée sur l'incertitude réelle.
 *
 * Elle était plafonnée à ±3 % en toutes circonstances, y compris avec une
 * fiabilité « faible ». Annoncer ±2 % sur un château sans devis de travaux ou
 * un terrain sans certificat d'urbanisme transformait tout écart normal de
 * marché en « votre estimation est fausse ».
 *
 * Trois choses déterminent l'incertitude :
 * - le type de bien : un appartement a des dizaines de comparables, un bien
 *   d'exception n'en a aucun ;
 * - la complétude du formulaire ;
 * - la présence d'un échantillon DVF exploitable, c'est-à-dire de vraies
 *   transactions à proximité.
 */
const FOURCHETTE_BASE: Record<string, Record<"elevee" | "moyenne" | "faible", number>> = {
  appartement: { elevee: 0.05, moyenne: 0.08, faible: 0.12 },
  maison: { elevee: 0.06, moyenne: 0.09, faible: 0.13 },
  immeuble: { elevee: 0.08, moyenne: 0.12, faible: 0.18 },
  terrain: { elevee: 0.1, moyenne: 0.15, faible: 0.2 },
  local_commercial: { elevee: 0.1, moyenne: 0.15, faible: 0.2 },
  atypique: { elevee: 0.12, moyenne: 0.18, faible: 0.25 },
};

function fourchette(opts: {
  type: string | null;
  fiabilite: "elevee" | "moyenne" | "faible";
  tension: "faible" | "moderee" | "forte";
  dvfExploitable: boolean;
}): number {
  const base = FOURCHETTE_BASE[opts.type ?? "maison"] ?? FOURCHETTE_BASE.maison;
  let pct = base[opts.fiabilite];
  // De vraies ventes à proximité resserrent la fourchette ; leur absence l'élargit.
  pct *= opts.dvfExploitable ? 0.85 : 1.1;
  // Un marché tendu se négocie peu : les prix de vente s'écartent moins du prix affiché.
  if (opts.tension === "forte") pct *= 0.9;
  else if (opts.tension === "faible") pct *= 1.05;
  return Math.min(0.3, Math.max(0.04, Math.round(pct * 1000) / 1000));
}

/**
 * Module un barème selon la taille déclarée, rapportée à une taille de
 * référence. Borné : une saisie farfelue ne doit pas emporter l'estimation.
 */
function facteurTaille(valeur: number, reference: number): number {
  return Math.max(0.5, Math.min(1.8, valeur / reference));
}

/**
 * Mélange le prix au m² issu de DVF avec la table de référence.
 *
 * DVF pèse 70 % car ce sont de vraies transactions, la table compensant le
 * délai de publication d'environ six mois. Mais un échantillon local peut
 * rester aberrant même après nettoyage — un code postal où seuls des biens
 * d'exception se sont vendus, par exemple. Au-delà d'un écart d'un facteur 2,5
 * dans un sens ou dans l'autre, on ne fait plus confiance à l'échantillon.
 */
function melangeAvecDvf(dvfPrixM2: number | null | undefined, prixTable: number): number {
  if (!dvfPrixM2 || dvfPrixM2 <= 0) return prixTable;
  const ratio = dvfPrixM2 / prixTable;
  if (ratio < 0.4 || ratio > 2.5) return prixTable;
  return Math.round(dvfPrixM2 * 0.7 + prixTable * 0.3);
}

/**
 * Taux de capitalisation attendu par un investisseur, déduit du niveau de prix
 * local. Un marché cher est un marché à faible rendement : un immeuble se
 * négocie autour de 3,5 % à Paris et de 9 % en zone rurale.
 */
function tauxCapitalisation(prixM2: number): number {
  if (prixM2 >= 8000) return 0.035;
  if (prixM2 >= 6000) return 0.04;
  if (prixM2 >= 4500) return 0.0475;
  if (prixM2 >= 3500) return 0.055;
  if (prixM2 >= 2500) return 0.065;
  if (prixM2 >= 1500) return 0.075;
  return 0.09;
}

// "terrain" ne figure plus ici : il a son propre modèle (computeTerrainEstimation).
const TYPE_MULT: Record<string, number> = {
  maison: 1.0,
  appartement: 1.05,
  local_commercial: 0.85,
  immeuble: 0.95,
  atypique: 1.1,
};

const ETAT_MULT: Record<string, { mult: number; label: string }> = {
  excellent: { mult: 1.08, label: "Excellent état" },
  bon: { mult: 1.0, label: "Bon état" },
  moyen: { mult: 0.93, label: "État moyen" },
  a_renover: { mult: 0.82, label: "À rénover" },
};

/**
 * Poids de chaque prestation dans le prix.
 *
 * ⚠️ L'ancienne liste ne correspondait à presque rien : sur les 34 prestations
 * du formulaire, elle n'en reconnaissait que 3 (alarme, domotique, fibre).
 * "parking", "cave" et "ascenseur" sont dans `exterieur`, pas dans
 * `prestations`, et "cheminee" / "climatisation" n'existent nulle part. Une
 * page entière de questions ne pesait donc que +3 % au maximum : un bien avec
 * PAC, photovoltaïque, ITE, plancher chauffant et vue mer était valorisé comme
 * un bien nu.
 */
const PRESTATION_POIDS: Record<string, number> = {
  // Fort impact — équipements coûteux à installer
  vue_degagee: 0.015,
  ilot: 0.01,
  // Impact moyen
  cuisine_equipee_electro: 0.01,
  sdb_renovee: 0.008,
  douche_italienne: 0.008,
  plan_pierre: 0.008,
  double_vitrage: 0.008,
  parquet: 0.008,
  calme: 0.008,
  lumineux: 0.008,
  quartier_recherche: 0.008,
  immeuble_recent: 0.008,
  construction_recente: 0.008,
  residence_securisee: 0.008,
  // Impact faible — confort, sans effet structurel sur le prix
  volets_elec: 0.004,
  pergola: 0.004,
  carrelage_pierre: 0.004,
  moulures: 0.004,
  dressing: 0.004,
  placards: 0.004,
  cuisine_amenagee: 0.006,
  baignoire_ilot: 0.004,
  double_vasque: 0.004,
  fibre: 0.004,
  domotique: 0.004,
  alarme: 0.004,
  portail_motorise: 0.004,
};
/** Plafond global : un bien tout équipé vaut ~12 % de plus qu'un bien nu, pas le double. */
const PRESTATION_CAP = 0.12;

const DPE_MULT: Record<string, { mult: number; label: string }> = {
  A: { mult: 1.06, label: "DPE A — très performant" },
  B: { mult: 1.04, label: "DPE B — performant" },
  C: { mult: 1.01, label: "DPE C — correct" },
  D: { mult: 1.0, label: "DPE D — moyen" },
  E: { mult: 0.96, label: "DPE E — passoire modérée" },
  F: { mult: 0.91, label: "DPE F — passoire énergétique" },
  G: { mult: 0.87, label: "DPE G — passoire énergétique" },
  inconnu: { mult: 0.98, label: "DPE non renseigné" },
};

/* ------------------------------------------------------------------ */
/* TERRAIN                                                             */
/* ------------------------------------------------------------------ */

/**
 * Prix moyen du m² de terrain à bâtir viabilisé, par département (€/m²).
 *
 * ⚠️ Ce sont des ordres de grandeur. Ils remplacent l'ancien calcul
 * (0,4 × prix du m² bâti), qui surévaluait les terrains d'un facteur 5 à 10 :
 * un terrain de 800 m² en zone à 3 500 €/m² bâti en ressortait à 1,1 M€.
 * À recalibrer sur les mutations DVF de nature « terrain à bâtir ».
 */
const PRIX_M2_TERRAIN: Record<string, number> = {
  "01": 201.6,
  "02": 59.4,
  "03": 43.7,
  "04": 92.2,
  "05": 220.3,
  "06": 267.3,
  "07": 144.8,
  "08": 41.9,
  "09": 82.5,
  "10": 62.9,
  "11": 129.8,
  "12": 62.4,
  "13": 394.7,
  "14": 157.7,
  "15": 52.5,
  "16": 52.1,
  "17": 153.1,
  "18": 57.9,
  "19": 45.7,
  "21": 81.1,
  "22": 91.2,
  "23": 24.6,
  "24": 51.3,
  "25": 72.2,
  "26": 162.6,
  "27": 141.9,
  "28": 99.8,
  "29": 96.8,
  "2A": 288.0,
  "2B": 129.1,
  "30": 229.3,
  "31": 188.6,
  "32": 69.0,
  "33": 292.7,
  "34": 343.2,
  "35": 144.6,
  "36": 38.5,
  "37": 99.4,
  "38": 185.1,
  "39": 56.7,
  "40": 211.3,
  "41": 74.3,
  "42": 116.3,
  "43": 53.3,
  "44": 183.7,
  "45": 93.5,
  "46": 63.3,
  "47": 52.3,
  "48": 55.6,
  "49": 129.2,
  "50": 70.6,
  "51": 119.0,
  "52": 38.8,
  "53": 84.0,
  "54": 94.5,
  "55": 32.2,
  "56": 152.4,
  "57": 120.0, // hors DVF
  "58": 33.6,
  "59": 189.4,
  "60": 157.6,
  "61": 48.4,
  "62": 125.0,
  "63": 80.4,
  "64": 186.4,
  "65": 69.0,
  "66": 310.9,
  "67": 200.0, // hors DVF
  "68": 180.0, // hors DVF
  "69": 349.9,
  "70": 37.9,
  "71": 80.3,
  "72": 58.3,
  "73": 206.4,
  "74": 349.0,
  "75": 1500.0, // hors DVF
  "76": 121.2,
  "77": 164.4,
  "78": 391.2,
  "79": 30.5,
  "80": 64.4,
  "81": 96.9,
  "82": 131.8,
  "83": 370.3,
  "84": 225.8,
  "85": 129.9,
  "86": 56.8,
  "87": 43.9,
  "88": 36.6,
  "89": 63.0,
  "90": 95.9,
  "91": 309.6,
  "92": 1072.3,
  "93": 639.1,
  "94": 795.7,
  "95": 464.7,
  "971": 99.4,
  "972": 96.5,
  "973": 65.0,
  "974": 258.9,
  "976": 150.0, // hors DVF
};
const PRIX_M2_TERRAIN_DEFAUT = 70;

/** Surface de parcelle déjà comprise dans le prix du m² bâti d'une maison. */
const TERRAIN_INCLUS = 644;

/** Nature du terrain : rapport au prix d'un terrain à bâtir équivalent. */
const NATURE_MULT: Record<string, { mult: number; label: string }> = {
  a_batir: { mult: 1, label: "Terrain à bâtir" },
  commercial: { mult: 0.85, label: "Terrain commercial / industriel" },
  loisirs: { mult: 0.15, label: "Terrain de loisirs" },
  non_constructible: { mult: 0.04, label: "Terrain non constructible" },
  agricole: { mult: 0.012, label: "Terrain agricole" },
  forestier: { mult: 0.008, label: "Terrain forestier" },
};

/**
 * Coût de raccordement d'un réseau manquant (€).
 * Déduit en montant fixe et non en pourcentage : viabiliser coûte le même prix
 * sur 300 m² que sur 3 000 m², alors qu'un pourcentage écraserait les petites
 * parcelles.
 */
const COUT_VIABILISATION: Record<string, { cout: number; label: string }> = {
  eau: { cout: 3000, label: "eau potable" },
  electricite: { cout: 3000, label: "électricité" },
  assainissement: { cout: 5000, label: "tout-à-l'égout" },
  gaz: { cout: 1500, label: "gaz" },
  fibre: { cout: 500, label: "fibre" },
};

const TOPO_MULT: Record<string, number> = {
  Plat: 1,
  "Pente légère": 0.95,
  "Forte pente": 0.82,
};

const VUE_BONUS: Record<string, number> = {
  Mer: 0.15,
  Montagne: 0.08,
  Dégagée: 0.05,
  Forêt: 0.03,
  Campagne: 0.02,
  Ville: 0,
};

const SITUATION_MULT: Record<string, number> = {
  "Centre-ville": 1.1,
  Lotissement: 1,
  Hameau: 0.85,
  "Zone isolée": 0.7,
};

const CONTRAINTE_MALUS: Record<string, { malus: number; label: string }> = {
  inondation: { malus: 0.15, label: "zone inondable" },
  ppr: { malus: 0.12, label: "PPR" },
  natura2000: { malus: 0.1, label: "Natura 2000" },
  servitudes: { malus: 0.07, label: "servitudes" },
  argiles: { malus: 0.05, label: "retrait-gonflement des argiles" },
  monuments: { malus: 0.05, label: "abords de monument historique" },
};

const POTENTIEL_BONUS: Record<string, { bonus: number; label: string }> = {
  permis_existant: { bonus: 0.12, label: "permis accordé" },
  divisible: { bonus: 0.1, label: "divisible" },
  certificat_urbanisme: { bonus: 0.05, label: "certificat d'urbanisme" },
  libre_constructeur: { bonus: 0.04, label: "libre de constructeur" },
  borne: { bonus: 0.03, label: "borné" },
  etude_sol: { bonus: 0.03, label: "étude de sol" },
  projet_etudie: { bonus: 0.03, label: "projet étudié" },
};

function basePrixM2Terrain(form: LeenkeyForm): number {
  const cp = (form.code_postal || form.departement || "").trim();
  // DOM : 3 chiffres (971xx…), Corse : 20xxx → 2A/2B, métropole : 2 chiffres.
  const dom = cp.slice(0, 3);
  if (PRIX_M2_TERRAIN[dom]) return PRIX_M2_TERRAIN[dom];
  if (cp.startsWith("20")) return PRIX_M2_TERRAIN["2A"];
  const dept = cp.slice(0, 2);
  return PRIX_M2_TERRAIN[dept] ?? PRIX_M2_TERRAIN_DEFAUT;
}

/**
 * Surface pondérée : au-delà de la taille d'un lot constructible courant, les
 * mètres carrés supplémentaires ne se vendent pas au même prix — c'est du
 * terrain d'agrément, pas de la constructibilité.
 */
function surfacePonderee(surface: number, nature: string): number {
  // Seuls les terrains constructibles subissent cette décote : elle traduit le
  // fait qu'au-delà d'un lot, le surplus n'est plus de la constructibilité mais
  // de l'agrément. Un terrain agricole, forestier ou non constructible se vend
  // à l'hectare, donc linéairement.
  if (nature !== "a_batir" && nature !== "commercial") return surface;
  const palier1 = Math.min(surface, 1000);
  const palier2 = Math.min(Math.max(surface - 1000, 0), 2000) * 0.3;
  const palier3 = Math.max(surface - 3000, 0) * 0.1;
  return palier1 + palier2 + palier3;
}

function computeTerrainEstimation(form: LeenkeyForm): EstimationResult {
  const surface = form.surface_terrain || 0;
  const nature = form.terrain_type ?? "a_batir";
  const natureEntry = NATURE_MULT[nature] ?? NATURE_MULT.a_batir;
  const prixM2Marche = basePrixM2Terrain(form);

  const facteurs: FactorImpact[] = [];

  // Constructibilité déclarée — seulement si la nature ne la tranche pas déjà.
  let constructibleMult = 1;
  if (nature === "a_batir" || nature === "commercial") {
    if (form.constructible === "Non") constructibleMult = 0.15;
    else if (form.constructible === "Je ne sais pas") constructibleMult = 0.85;
  }

  const topoMult = TOPO_MULT[form.topographie ?? "Plat"] ?? 1;

  let vueMult = 1;
  const vueLabels: string[] = [];
  for (const v of form.vue) {
    const bonus = VUE_BONUS[v];
    if (bonus) {
      vueMult += bonus;
      if (bonus > 0) vueLabels.push(v.toLowerCase());
    }
  }

  const situationMult = SITUATION_MULT[form.situation_terrain ?? "Lotissement"] ?? 1;

  let contrainteMult = 1;
  const contrainteLabels: string[] = [];
  for (const c of form.contraintes_terrain) {
    const entry = CONTRAINTE_MALUS[c];
    if (entry) {
      contrainteMult -= entry.malus;
      contrainteLabels.push(entry.label);
    }
  }
  contrainteMult = Math.max(0.4, contrainteMult);

  let potentielMult = 1;
  const potentielLabels: string[] = [];
  for (const p of form.potentiel_foncier) {
    const entry = POTENTIEL_BONUS[p];
    if (entry) {
      potentielMult += entry.bonus;
      potentielLabels.push(entry.label);
    }
  }

  // Une façade trop étroite bride le projet constructible.
  let facadeMult = 1;
  if (form.facade && form.facade > 0 && form.facade < 8 && nature === "a_batir") {
    facadeMult = 0.92;
  }

  // Accessibilité : commerces et écoles à portée élargissent la clientèle.
  let accesMult = 1;
  const proches = [form.distances.commerces, form.distances.ecoles].filter(
    (d) => d === "< 5 min",
  ).length;
  const loin = [form.distances.commerces, form.distances.ecoles].filter(
    (d) => d === "> 20 min",
  ).length;
  accesMult += proches * 0.02 - loin * 0.04;

  const globalMult =
    natureEntry.mult *
    constructibleMult *
    topoMult *
    vueMult *
    situationMult *
    contrainteMult *
    potentielMult *
    facadeMult *
    accesMult;

  // Non arrondi : un terrain agricole vaut ~0,3 €/m², un arrondi à l'entier le
  // ramènerait à zéro.
  const prixM2Exact = prixM2Marche * globalMult;
  const valeurBrute = prixM2Exact * surfacePonderee(surface, nature);

  // Réseaux manquants : déduits au coût de raccordement (uniquement là où la
  // viabilisation a un sens — un terrain agricole ne se viabilise pas).
  let coutViabilisation = 0;
  const manquants: string[] = [];
  if (nature === "a_batir" || nature === "commercial") {
    for (const [key, entry] of Object.entries(COUT_VIABILISATION)) {
      if (!form.viabilisation.includes(key)) {
        coutViabilisation += entry.cout;
        manquants.push(entry.label);
      }
    }
  }

  // Arrondi au millier pour les valeurs courantes, à la centaine en dessous de
  // 10 000 € : arrondir au millier un terrain agricole à 4 200 € le déformerait.
  const brut = Math.max(0, valeurBrute - coutViabilisation);
  const pas = brut < 10000 ? 100 : 1000;
  const prixEstime = Math.round(brut / pas) * pas;

  // Sous 10 €/m² (agricole, forestier), l'entier ne suffit plus à rendre compte
  // de l'écart : on garde une décimale.
  const prixM2Brut = surface > 0 ? prixEstime / surface : 0;
  const prixM2Final = prixM2Brut >= 10 ? Math.round(prixM2Brut) : Math.round(prixM2Brut * 10) / 10;
  const deltaMarche = Math.round(((prixM2Final - prixM2Marche) / prixM2Marche) * 100);

  facteurs.push(
    {
      label: "Nature du terrain",
      impact: Math.round((natureEntry.mult - 1) * 100),
      detail: natureEntry.label,
    },
    {
      label: "Constructibilité",
      impact: Math.round((constructibleMult - 1) * 100),
      detail:
        form.constructible === "Oui"
          ? `Constructible${form.zonage_plu ? ` · ${form.zonage_plu}` : ""}`
          : form.constructible === "Non"
            ? "Non constructible"
            : "Constructibilité à confirmer en mairie",
    },
    {
      label: "Viabilisation",
      impact: 0,
      detail: manquants.length
        ? `${manquants.length} réseau${manquants.length > 1 ? "x" : ""} à raccorder (${manquants.join(", ")}) — ${coutViabilisation.toLocaleString("fr-FR")} € déduits`
        : "Terrain entièrement viabilisé",
    },
    {
      label: "Terrain & vue",
      impact: Math.round((topoMult * vueMult - 1) * 100),
      detail: [form.topographie, ...vueLabels].filter(Boolean).join(", ") || "Non renseigné",
    },
    {
      label: "Situation",
      impact: Math.round((situationMult * accesMult - 1) * 100),
      detail: form.situation_terrain ?? "Non renseignée",
    },
    {
      label: "Contraintes",
      impact: Math.round((contrainteMult - 1) * 100),
      detail: contrainteLabels.length ? contrainteLabels.join(", ") : "Aucune déclarée",
    },
    {
      label: "Potentiel foncier",
      impact: Math.round((potentielMult - 1) * 100),
      detail: potentielLabels.length ? potentielLabels.join(", ") : "Aucune démarche engagée",
    },
  );

  // Fiabilité : complétude des champs qui pèsent réellement sur le prix.
  const champsClés: Array<keyof LeenkeyForm> = [
    "adresse",
    "code_postal",
    "surface_terrain",
    "terrain_type",
    "constructible",
    "zonage_plu",
    "topographie",
    "situation_terrain",
  ];
  const complet = champsClés.filter((k) => {
    const v = form[k];
    return v !== null && v !== "" && v !== undefined;
  }).length;
  const fiabiliteScore = Math.round((complet / champsClés.length) * 100);
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  // DVF ne couvre pas les terrains : l'endpoint renvoie available:false.
  const dvfExploitable = false;
  const tensionMarche = tension(form);
  const rangePct = fourchette({
    type: form.type,
    fiabilite,
    tension: tensionMarche,
    dvfExploitable,
  });

  // Score d'attractivité : constructibilité et viabilisation d'abord.
  let score = 40;
  if (form.constructible === "Oui") score += 25;
  score += Math.round((form.viabilisation.length / 5) * 15);
  score += Math.round((potentielMult - 1) * 100);
  score += Math.round((contrainteMult - 1) * 100);
  score += Math.round((vueMult - 1) * 100);
  score = Math.max(0, Math.min(100, score));

  let delaiBase: [number, number] = [90, 150];
  if (nature === "a_batir" && form.constructible === "Oui") delaiBase = [60, 100];
  if (nature === "agricole" || nature === "forestier") delaiBase = [120, 240];
  if (tensionMarche === "forte") delaiBase = [delaiBase[0] - 20, delaiBase[1] - 30];

  const recommandations: Recommendation[] = [];
  if (manquants.length) {
    recommandations.push({
      title: "Viabiliser avant la mise en vente",
      description: `Il manque : ${manquants.join(", ")}. Un terrain viabilisé se vend plus vite et se négocie moins.`,
      uplift: `+${coutViabilisation.toLocaleString("fr-FR")} € environ`,
    });
  }
  if (form.constructible === "Je ne sais pas") {
    recommandations.push({
      title: "Demander un certificat d'urbanisme",
      description:
        "Le CU est gratuit et s'obtient en mairie sous 1 à 2 mois. Sans lui, les acheteurs appliquent une décote de précaution.",
      uplift: "+10 à 15%",
    });
  }
  if (!form.potentiel_foncier.includes("borne")) {
    recommandations.push({
      title: "Faire borner le terrain",
      description:
        "Un bornage par géomètre lève l'incertitude sur les limites et évite les litiges — souvent exigé par l'acheteur.",
      uplift: "+2 à 4%",
    });
  }
  if (!form.potentiel_foncier.includes("divisible") && surface > 1200 && nature === "a_batir") {
    recommandations.push({
      title: "Étudier une division parcellaire",
      description:
        "Au-delà de 1 200 m², deux lots se vendent souvent mieux qu'un grand terrain unique.",
      uplift: "+10 à 20%",
    });
  }
  if (recommandations.length < 3) {
    recommandations.push({
      title: "Réunir le dossier foncier",
      description:
        "Plan cadastral, CU, étude de sol et relevé de bornage : un dossier complet rassure et accélère la vente.",
    });
  }

  return {
    prixEstime,
    prixBas: Math.round((prixEstime * (1 - rangePct)) / 1000) * 1000,
    prixHaut: Math.round((prixEstime * (1 + rangePct)) / 1000) * 1000,
    prixM2: prixM2Final,
    prixM2Marche,
    deltaMarche,
    surface,
    fiabilite,
    fiabiliteScore,
    scoreAttractivite: score,
    delaiVente: `${delaiBase[0]}–${delaiBase[1]} jours`,
    tensionMarche,
    facteurs,
    recommandations: recommandations.slice(0, 3),
  };
}

/* ------------------------------------------------------------------ */
/* LOCAL COMMERCIAL                                                    */
/* ------------------------------------------------------------------ */

/**
 * Qualité de l'emplacement commercial.
 *
 * - `prixMult` : rapport entre le prix du m² commercial et celui du m²
 *   résidentiel du secteur. En pied d'artère n°1 le commercial dépasse le
 *   logement ; en zone artisanale il en vaut le tiers.
 * - `taux` : taux de capitalisation attendu par un investisseur. Plus
 *   l'emplacement est sûr, plus le taux est bas — donc le prix élevé.
 */
const EMPLACEMENT: Record<string, { prixMult: number; taux: number; label: string }> = {
  tres_commercante: { prixMult: 1.3, taux: 0.06, label: "Rue très commerçante" },
  passante: { prixMult: 0.95, taux: 0.07, label: "Rue passante" },
  secondaire: { prixMult: 0.7, taux: 0.085, label: "Rue secondaire" },
  residentielle: { prixMult: 0.6, taux: 0.09, label: "Zone résidentielle" },
  artisanale: { prixMult: 0.35, taux: 0.1, label: "Zone artisanale" },
};

/** Destination du local : liquidité et prix au m² relatifs. */
const LOCAL_TYPE_MULT: Record<string, { mult: number; label: string }> = {
  boutique: { mult: 1, label: "Boutique" },
  alimentaire: { mult: 1.05, label: "Commerce alimentaire" },
  restaurant: { mult: 1.02, label: "Restaurant" },
  bar: { mult: 1, label: "Bar" },
  coiffure: { mult: 0.95, label: "Salon de coiffure" },
  medical: { mult: 1.05, label: "Cabinet médical" },
  bureau: { mult: 0.9, label: "Bureau" },
  activite: { mult: 0.6, label: "Local d'activité" },
  entrepot: { mult: 0.45, label: "Entrepôt" },
  autre: { mult: 0.85, label: "Autre local" },
};

const NIVEAU_BONUS: Record<string, number> = {
  Excellent: 0.06,
  Bon: 0.02,
  Moyen: 0,
  Faible: -0.05,
};

const LOCAL_CONFIG_BONUS: Record<string, { bonus: number; label: string }> = {
  angle: { bonus: 0.12, label: "local d'angle" },
  traversant: { bonus: 0.05, label: "traversant" },
  plain_pied: { bonus: 0.04, label: "de plain-pied" },
  plusieurs_niveaux: { bonus: -0.03, label: "sur plusieurs niveaux" },
};

const LOCAL_POTENTIEL_BONUS: Record<string, { bonus: number; label: string }> = {
  changement_destination: { bonus: 0.08, label: "changement de destination possible" },
  extraction_possible: { bonus: 0.05, label: "extraction réalisable" },
  divisible: { bonus: 0.05, label: "divisible" },
  terrasse: { bonus: 0.05, label: "terrasse" },
  pmr_conforme: { bonus: 0.04, label: "conforme PMR" },
  reunifiable: { bonus: 0.03, label: "réunifiable" },
  erp: { bonus: 0.02, label: "classé ERP" },
  enseigne: { bonus: 0.02, label: "enseigne autorisée" },
};

/** Un bail long sécurise le revenu : l'investisseur accepte un taux plus bas. */
const BAIL_TAUX_AJUST: Record<string, number> = {
  "Plus de 6 ans": -0.005,
  "3 à 6 ans": -0.0025,
  "1 à 3 ans": 0,
  "Moins d'un an": 0.005,
};

function computeLocalEstimation(form: LeenkeyForm, dvfPrixM2?: number | null): EstimationResult {
  const emplacement = EMPLACEMENT[form.environnement ?? "secondaire"] ?? EMPLACEMENT.secondaire;
  const typeEntry = LOCAL_TYPE_MULT[form.local_type ?? "boutique"] ?? LOCAL_TYPE_MULT.boutique;

  // Surface pondérée : la réserve ne vaut pas la surface de vente.
  const totale = form.surface_totale || 0;
  const vente = form.surface_vente ?? 0;
  const reserve = form.surface_reserve ?? 0;
  const surfacePonderee =
    vente + reserve > 0
      ? vente + reserve * 0.4 + Math.max(0, totale - vente - reserve) * 0.6
      : totale;

  // Base résidentielle du secteur, convertie en prix commercial.
  const baseResidentiel = melangeAvecDvf(dvfPrixM2, basePrixM2(form));
  const prixM2Marche = Math.round(baseResidentiel * emplacement.prixMult);

  const etatEntry = ETAT_MULT[form.etat ?? "bon"] ?? ETAT_MULT.bon;

  let configMult = 1;
  const configLabels: string[] = [];
  for (const c of form.local_config) {
    const e = LOCAL_CONFIG_BONUS[c];
    if (e) {
      configMult += e.bonus;
      configLabels.push(e.label);
    }
  }

  // Une vitrine large est le principal vecteur de chalandise d'une boutique.
  let vitrineMult = 1;
  if (form.longueur_vitrine) {
    if (form.longueur_vitrine >= 10) vitrineMult = 1.08;
    else if (form.longueur_vitrine >= 6) vitrineMult = 1.04;
    else if (form.longueur_vitrine < 3) vitrineMult = 0.94;
  }

  const fluxMult =
    1 +
    (NIVEAU_BONUS[form.visibilite ?? "Moyen"] ?? 0) +
    (NIVEAU_BONUS[form.flux_pieton ?? "Moyen"] ?? 0);

  // Le DPE pèse moins sur du commercial que sur du logement, mais il pèse : le
  // décret tertiaire impose des réductions de consommation aux surfaces de
  // plus de 1 000 m², et un local énergivore se reloue plus difficilement.
  const dpeLocal = DPE_MULT[form.dpe ?? "inconnu"] ?? DPE_MULT.inconnu;
  const dpeMult = 1 + (dpeLocal.mult - 1) * 0.6;

  let equipMult = 1;
  for (const e of form.local_equipements) {
    if (e === "extraction") equipMult += 0.04;
    else if (e === "pmr") equipMult += 0.03;
    else equipMult += 0.015;
  }

  let potentielMult = 1;
  const potentielLabels: string[] = [];
  for (const p of form.local_potentiel) {
    const e = LOCAL_POTENTIEL_BONUS[p];
    if (e) {
      potentielMult += e.bonus;
      potentielLabels.push(e.label);
    }
  }
  // Chaque usage supplémentaire élargit la clientèle d'acquéreurs.
  potentielMult += Math.min(form.potentiel_transformation.length * 0.015, 0.06);

  let accesMult = 1;
  if (form.stationnement.includes("Parking privé")) accesMult += 0.04;
  if (form.transports.length) accesMult += Math.min(form.transports.length * 0.015, 0.05);
  if (form.acces_livraison === "Impossible") accesMult -= 0.04;

  const globalMult =
    typeEntry.mult *
    etatEntry.mult *
    configMult *
    vitrineMult *
    fluxMult *
    equipMult *
    potentielMult *
    accesMult *
    dpeMult;

  // ── Méthode 1 : comparaison au m² ──
  const prixM2 = Math.round(prixM2Marche * globalMult);
  const valeurComparaison = prixM2 * surfacePonderee;

  // ── Méthode 2 : capitalisation du loyer ──
  // Un local loué se vend à un investisseur, qui raisonne en rendement et non
  // en prix au mètre carré.
  const loyer = form.loyer_annuel ?? 0;
  const occupe = form.local_occupation === "Occupé — bail en cours" && loyer > 0;
  let valeurRendement = 0;
  let taux = emplacement.taux;
  if (occupe) {
    taux += BAIL_TAUX_AJUST[form.bail_duree_restante ?? "1 à 3 ans"] ?? 0;
    if (form.etat === "a_renover") taux += 0.01;
    else if (form.etat === "excellent") taux -= 0.005;
    taux = Math.max(0.04, taux);
    // Revenu net : la taxe foncière reste à la charge du bailleur.
    const loyerNet = Math.max(0, loyer - (form.taxe_fonciere ?? 0));
    valeurRendement = loyerNet / taux;
  }

  // Local loué : le rendement prime (c'est ce que regarde l'acquéreur), la
  // comparaison sert de garde-fou. Local libre : comparaison seule.
  const valeur = occupe ? valeurRendement * 0.7 + valeurComparaison * 0.3 : valeurComparaison;

  const prixEstime = Math.max(0, Math.round(valeur / 1000) * 1000);
  const prixM2Final = totale > 0 ? Math.round(prixEstime / totale) : 0;
  const deltaMarche = Math.round(((prixM2Final - prixM2Marche) / prixM2Marche) * 100);

  const facteurs: FactorImpact[] = [
    {
      label: "Emplacement commercial",
      impact: Math.round((emplacement.prixMult - 1) * 100),
      detail: `${emplacement.label} · ${prixM2Marche.toLocaleString("fr-FR")} €/m² de référence`,
    },
    {
      label: "Destination",
      impact: Math.round((typeEntry.mult - 1) * 100),
      detail: typeEntry.label,
    },
    {
      label: "Configuration & vitrine",
      impact: Math.round((configMult * vitrineMult - 1) * 100),
      detail:
        [...configLabels, form.longueur_vitrine ? `vitrine de ${form.longueur_vitrine} m` : ""]
          .filter(Boolean)
          .join(", ") || "Configuration standard",
    },
    {
      label: "Flux & visibilité",
      impact: Math.round((fluxMult - 1) * 100),
      detail: `Visibilité ${(form.visibilite ?? "non renseignée").toLowerCase()} · flux piéton ${(form.flux_pieton ?? "non renseigné").toLowerCase()}`,
    },
    {
      label: "État & équipements",
      impact: Math.round((etatEntry.mult * equipMult - 1) * 100),
      detail: etatEntry.label,
    },
    {
      label: "Performance énergétique",
      impact: Math.round((dpeMult - 1) * 100),
      detail: dpeLocal.label,
    },
    {
      label: "Potentiel",
      impact: Math.round((potentielMult - 1) * 100),
      detail: potentielLabels.length ? potentielLabels.join(", ") : "Aucun atout déclaré",
    },
  ];

  if (occupe) {
    facteurs.unshift({
      label: "Rendement locatif",
      impact: 0,
      detail: `${loyer.toLocaleString("fr-FR")} € de loyer annuel capitalisés à ${(taux * 100).toFixed(1)} % — soit ${(Math.round(valeurRendement / 1000) * 1000).toLocaleString("fr-FR")} € par la méthode du rendement`,
    });

    // Les deux méthodes doivent converger. Un écart marqué signifie que le
    // loyer en place est décalé du marché — c'est une information de
    // négociation, pas un détail à lisser en silence dans la moyenne.
    const ecart = (valeurRendement - valeurComparaison) / valeurComparaison;
    if (Math.abs(ecart) > 0.3) {
      facteurs.push({
        label: "Écart entre les deux méthodes",
        impact: Math.round(ecart * 100),
        detail:
          ecart < 0
            ? `Le loyer en place valorise le local ${Math.abs(Math.round(ecart * 100))} % sous sa valeur au m². Un loyer sous-évalué : à la révision ou au départ du locataire, le bien retrouve son potentiel.`
            : `Le loyer en place valorise le local ${Math.round(ecart * 100)} % au-dessus de sa valeur au m². Un acquéreur vérifiera que ce loyer est tenable dans la durée.`,
      });
    }
  }

  const champsClés: Array<keyof LeenkeyForm> = [
    "adresse",
    "code_postal",
    "surface_totale",
    "local_type",
    "environnement",
    "etat",
    "local_occupation",
    "visibilite",
  ];
  const complet = champsClés.filter((k) => {
    const v = form[k];
    return v !== null && v !== "" && v !== undefined;
  }).length;
  const fiabiliteScore = Math.round((complet / champsClés.length) * 100);
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  const dvfExploitable = !!dvfPrixM2 && dvfPrixM2 > 0;
  const tensionMarche = tension(form);
  const rangePct = fourchette({
    type: form.type,
    fiabilite,
    tension: tensionMarche,
    dvfExploitable,
  });

  let score = 50;
  score += Math.round((emplacement.prixMult - 0.7) * 40);
  score += Math.round((fluxMult - 1) * 100);
  score += Math.round((potentielMult - 1) * 100);
  score += Math.round((etatEntry.mult - 1) * 100);
  if (occupe) score += 8;
  score = Math.max(0, Math.min(100, score));

  // Le commerce se vend plus lentement que le résidentiel.
  let delaiBase: [number, number] = [120, 210];
  if (emplacement.prixMult >= 1.3) delaiBase = [60, 120];
  else if (emplacement.prixMult >= 0.95) delaiBase = [90, 150];
  if (occupe) delaiBase = [delaiBase[0] - 20, delaiBase[1] - 30];
  if (form.etat === "a_renover") delaiBase = [delaiBase[0] + 30, delaiBase[1] + 60];

  const recommandations: Recommendation[] = [];
  if (!occupe) {
    recommandations.push({
      title: "Louer avant de vendre",
      description:
        "Un local occupé par un locataire solide se vend à un investisseur, sur la base du rendement — une clientèle plus large et plus rapide qu'un local vide.",
      uplift: "+5 à 15%",
    });
  }
  if (!form.local_equipements.includes("pmr")) {
    recommandations.push({
      title: "Mettre le local aux normes PMR",
      description:
        "L'accessibilité est obligatoire pour tout ERP. Sans elle, l'acheteur déduit le coût des travaux de son offre.",
      uplift: "+3 à 5%",
    });
  }
  if (!form.local_potentiel.includes("extraction_possible") && form.local_type !== "restaurant") {
    recommandations.push({
      title: "Faire vérifier la faisabilité d'une extraction",
      description:
        "Une extraction possible ouvre le local à la restauration, de loin la demande la plus forte du marché commercial.",
      uplift: "+5 à 10%",
    });
  }
  if (form.etat === "a_renover" || form.etat === "moyen") {
    recommandations.push({
      title: "Reprendre la devanture",
      description:
        "La vitrine est le premier élément vu par un repreneur. Une devanture refaite change la perception du local pour un budget limité.",
      uplift: "+3 à 6%",
    });
  }
  if (recommandations.length < 3) {
    recommandations.push({
      title: "Réunir le dossier commercial",
      description:
        "Bail, quittances, taxe foncière, diagnostics et attestation ERP : un dossier complet est décisif pour un acquéreur investisseur.",
    });
  }

  return {
    prixEstime,
    prixBas: Math.round((prixEstime * (1 - rangePct)) / 1000) * 1000,
    prixHaut: Math.round((prixEstime * (1 + rangePct)) / 1000) * 1000,
    prixM2: prixM2Final,
    prixM2Marche,
    deltaMarche,
    surface: totale,
    fiabilite,
    fiabiliteScore,
    scoreAttractivite: score,
    delaiVente: `${delaiBase[0]}–${delaiBase[1]} jours`,
    tensionMarche,
    facteurs,
    recommandations: recommandations.slice(0, 3),
  };
}

/* ------------------------------------------------------------------ */
/* IMMEUBLE                                                            */
/* ------------------------------------------------------------------ */

/** Décote appliquée à une vente en bloc : un immeuble entier vaut moins que la somme de ses lots. */
const DECOTE_BLOC = 0.22;

/** Coût relatif de la reprise de chaque poste technique. */
const POSTE_MALUS: Record<string, number> = {
  Toiture: 0.06,
  Façade: 0.05,
  Électricité: 0.04,
  "Parties communes": 0.02,
  Plomberie: 0.03,
  Chauffage: 0.03,
  "Colonnes (eau, gaz, évacuation)": 0.03,
  Isolation: 0.03,
  Fenêtres: 0.03,
};
const TRAVAUX_MALUS_MAX = 0.25;

const IMMEUBLE_POTENTIEL_BONUS: Record<string, { bonus: number; label: string }> = {
  surelevation: { bonus: 0.1, label: "surélévation" },
  division: { bonus: 0.08, label: "division de lots" },
  nouveaux_lots: { bonus: 0.07, label: "création de lots" },
  construction_arriere: { bonus: 0.06, label: "construction en fond de parcelle" },
  combles: { bonus: 0.05, label: "combles aménageables" },
  extension: { bonus: 0.05, label: "extension" },
  changement_destination: { bonus: 0.04, label: "changement de destination" },
  commercial_transformable: { bonus: 0.04, label: "commercial transformable" },
  sous_sol: { bonus: 0.03, label: "sous-sol exploitable" },
};

function computeImmeubleEstimation(form: LeenkeyForm, dvfPrixM2?: number | null): EstimationResult {
  const stats = statsLocatives(form.lots);
  const charges = totalCharges(form);
  const revenuNet = stats.revenusAnnuels - charges;
  const surface = form.surface_totale_immeuble || form.surface_habitable_immeuble || 0;

  // ── Travaux : chaque poste à reprendre est une décote directe ──
  let travauxMalus = 0;
  const postesARefaire: string[] = [];
  for (const poste of POSTES_TECHNIQUES) {
    const etat = form.etat_technique[poste];
    const malus = POSTE_MALUS[poste] ?? 0.03;
    // Un poste repris récemment ne peut pas être compté comme à refaire.
    if (form.travaux_recents.includes(poste)) continue;
    if (etat === "À refaire") {
      travauxMalus += malus;
      postesARefaire.push(poste.toLowerCase());
    } else if (etat === "Moyen") {
      travauxMalus += malus / 2;
    }
  }
  travauxMalus = Math.min(travauxMalus, TRAVAUX_MALUS_MAX);
  const travauxMult = 1 - travauxMalus;

  // ── Potentiel de développement ──
  let potentielMult = 1;
  const potentielLabels: string[] = [];
  for (const p of form.potentiel_developpement) {
    const e = IMMEUBLE_POTENTIEL_BONUS[p];
    if (e) {
      potentielMult += e.bonus;
      potentielLabels.push(e.label);
    }
  }

  // ── DPE du parc : depuis 2025 un logement G ne peut plus être loué ──
  const lotsAvecDpe = form.lots.filter((l) => l.dpe && l.dpe !== "inconnu");
  const passoires = lotsAvecDpe.filter((l) => l.dpe === "F" || l.dpe === "G").length;
  // À défaut de DPE lot par lot, le diagnostic collectif de l'immeuble vaut
  // indication pour l'ensemble du parc.
  const dpeGlobalPassoire = form.dpe === "F" || form.dpe === "G";
  const partPassoires = lotsAvecDpe.length
    ? passoires / lotsAvecDpe.length
    : dpeGlobalPassoire
      ? 1
      : 0;
  const dpeMult = 1 - partPassoires * 0.1;

  const prixM2Lot = melangeAvecDvf(dvfPrixM2, basePrixM2(form));

  // ── Méthode 1 : capitalisation du revenu net ──
  let taux = tauxCapitalisation(prixM2Lot);
  // La vacance est un risque : l'acquéreur exige un rendement plus élevé.
  if (stats.nbLots > 0 && stats.tauxOccupation < 80) {
    taux += ((80 - stats.tauxOccupation) / 100) * 0.02;
  }
  if (travauxMalus > 0.12) taux += 0.005;
  taux = Math.max(0.03, taux);
  const valeurRendement = revenuNet > 0 ? (revenuNet / taux) * potentielMult * dpeMult : 0;

  // ── Méthode 2 : valeur à la découpe, moins la décote de bloc ──
  const surfaceHab = form.surface_habitable_immeuble ?? 0;
  const surfaceCom = form.surface_commerciale ?? 0;
  const surfaceValorisee = surfaceHab + surfaceCom > 0 ? surfaceHab + surfaceCom * 0.95 : surface;
  const valeurDecoupe = surfaceValorisee * prixM2Lot;
  // Un immeuble vide ne produit rien pendant sa commercialisation, et la raison
  // de la vacance inquiète l'acquéreur : la valeur patrimoniale en tient compte
  // elle aussi, sans quoi vider un immeuble le rendrait gratuitement plus cher.
  const occupationMult = stats.nbLots ? 0.92 + 0.08 * (stats.tauxOccupation / 100) : 1;
  const valeurBloc =
    valeurDecoupe * (1 - DECOTE_BLOC) * travauxMult * potentielMult * dpeMult * occupationMult;

  // Un immeuble loué se vend à son rendement ; sans revenu, seule la valeur
  // patrimoniale existe.
  const loue = revenuNet > 0;
  const valeur = loue ? valeurRendement * 0.65 + valeurBloc * 0.35 : valeurBloc;

  const prixEstime = Math.max(0, Math.round(valeur / 1000) * 1000);
  const prixM2Final = surface > 0 ? Math.round(prixEstime / surface) : 0;
  const prixM2Marche = prixM2Lot;
  const deltaMarche = Math.round(((prixM2Final - prixM2Marche) / prixM2Marche) * 100);

  const facteurs: FactorImpact[] = [];
  if (loue) {
    facteurs.push({
      label: "Rendement locatif",
      impact: 0,
      detail: `${stats.revenusAnnuels.toLocaleString("fr-FR")} € de loyers − ${charges.toLocaleString("fr-FR")} € de charges = ${revenuNet.toLocaleString("fr-FR")} € nets, capitalisés à ${(taux * 100).toFixed(2)} %`,
    });
  } else {
    facteurs.push({
      label: "Rendement locatif",
      impact: 0,
      detail: "Aucun revenu net déclaré — l'immeuble est valorisé sur sa seule valeur patrimoniale",
    });
  }
  facteurs.push(
    {
      label: "Occupation",
      impact: Math.round((occupationMult - 1) * 100),
      detail: `${stats.nbOccupes}/${stats.nbLots} lots loués — ${stats.tauxOccupation} % d'occupation${
        stats.potentielVacance
          ? ` · ${stats.potentielVacance.toLocaleString("fr-FR")} € de loyers annuels à récupérer`
          : ""
      }`,
    },
    {
      label: "État technique",
      impact: -Math.round(travauxMalus * 100),
      detail: postesARefaire.length
        ? `À reprendre : ${postesARefaire.join(", ")}`
        : "Aucun poste majeur à reprendre",
    },
    {
      label: "Potentiel de développement",
      impact: Math.round((potentielMult - 1) * 100),
      detail: potentielLabels.length ? potentielLabels.join(", ") : "Aucun potentiel déclaré",
    },
    {
      label: "Vente en bloc",
      impact: -Math.round(DECOTE_BLOC * 100),
      detail: `Un immeuble entier se négocie sous la somme de ses lots · valeur à la découpe estimée ${(Math.round(valeurDecoupe / 1000) * 1000).toLocaleString("fr-FR")} €`,
    },
  );
  // Les deux méthodes doivent converger. Un écart marqué signifie que les
  // loyers en place sont décalés du marché : c'est le principal levier de
  // négociation d'un immeuble de rapport, il doit être dit.
  if (loue && valeurBloc > 0) {
    const ecart = (valeurRendement - valeurBloc) / valeurBloc;
    if (Math.abs(ecart) > 0.3) {
      facteurs.push({
        label: "Loyers en place vs marché",
        impact: Math.round(ecart * 100),
        detail:
          ecart < 0
            ? `Les loyers actuels valorisent l'immeuble ${Math.abs(Math.round(ecart * 100))} % sous sa valeur patrimoniale : ils sont en dessous du marché. Les remettre à niveau au fil des relocations est le premier levier de valeur.`
            : `Les loyers actuels valorisent l'immeuble ${Math.round(ecart * 100)} % au-dessus de sa valeur patrimoniale. Un acquéreur vérifiera qu'ils sont tenables dans la durée.`,
      });
    }
  }
  if (!lotsAvecDpe.length && form.dpe && form.dpe !== "inconnu") {
    facteurs.push({
      label: "Performance énergétique",
      impact: Math.round((dpeMult - 1) * 100),
      detail: `DPE global de l'immeuble : ${form.dpe}${dpeGlobalPassoire ? " — location interdite pour les G depuis 2025" : ""}`,
    });
  }
  if (lotsAvecDpe.length && passoires) {
    facteurs.push({
      label: "Performance énergétique du parc",
      impact: -Math.round(partPassoires * 10),
      detail: `${passoires} lot${passoires > 1 ? "s" : ""} en DPE F ou G sur ${lotsAvecDpe.length} renseignés — location interdite pour les G depuis 2025`,
    });
  }

  const champsClés: Array<keyof LeenkeyForm> = [
    "adresse",
    "code_postal",
    "immeuble_type",
    "surface_totale_immeuble",
    "surface_habitable_immeuble",
    "charge_taxe_fonciere",
  ];
  let complet = champsClés.filter((k) => {
    const v = form[k];
    return v !== null && v !== "" && v !== undefined;
  }).length;
  if (form.lots.length) complet += 1;
  if (stats.revenusAnnuels > 0) complet += 1;
  const fiabiliteScore = Math.round((complet / (champsClés.length + 2)) * 100);
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  const dvfExploitable = !!dvfPrixM2 && dvfPrixM2 > 0;
  const tensionMarche = tension(form);
  const rangePct = fourchette({
    type: form.type,
    fiabilite,
    tension: tensionMarche,
    dvfExploitable,
  });

  let score = 45;
  score += Math.round((stats.tauxOccupation - 70) / 3);
  score -= Math.round(travauxMalus * 120);
  score += Math.round((potentielMult - 1) * 120);
  score -= Math.round(partPassoires * 15);
  score = Math.max(0, Math.min(100, score));

  let delaiBase: [number, number] = [120, 210];
  if (loue && stats.tauxOccupation >= 90) delaiBase = [75, 150];
  if (travauxMalus > 0.15) delaiBase = [delaiBase[0] + 30, delaiBase[1] + 60];

  const recommandations: Recommendation[] = [];
  if (stats.potentielVacance > 0) {
    recommandations.push({
      title: "Relouer les lots vacants avant la vente",
      description: `Les lots libres représentent ${stats.potentielVacance.toLocaleString("fr-FR")} € de loyers annuels. Un immeuble plein se vend sur un rendement constaté, pas sur une promesse.`,
      uplift: `+${(Math.round(((stats.potentielVacance / taux) * 0.65) / 1000) * 1000).toLocaleString("fr-FR")} € environ`,
    });
  }
  if (postesARefaire.length) {
    recommandations.push({
      title: `Chiffrer les travaux : ${postesARefaire.slice(0, 3).join(", ")}`,
      description:
        "Un devis d'entreprise vaut mieux qu'une estimation d'acquéreur : sans chiffrage, l'acheteur retient toujours l'hypothèse haute.",
      uplift: `+${Math.round(travauxMalus * 50)} % de la décote évitée`,
    });
  }
  if (passoires) {
    recommandations.push({
      title: "Traiter les lots en DPE F et G",
      description:
        "Les logements classés G ne sont plus louables depuis 2025, les F suivront. Un acquéreur déduit le coût de la rénovation, souvent plus large que son coût réel.",
      uplift: "+5 à 10%",
    });
  }
  if (!form.potentiel_developpement.length) {
    recommandations.push({
      title: "Faire étudier le potentiel du PLU",
      description:
        "Surélévation, division, combles : un potentiel documenté élargit la clientèle aux marchands de biens et fait monter les offres.",
      uplift: "+5 à 15%",
    });
  }
  if (recommandations.length < 3) {
    recommandations.push({
      title: "Préparer le dossier investisseur",
      description:
        "Baux, quittances, taxe foncière, charges détaillées, DPE de chaque lot et diagnostics communs : c'est ce qu'un acquéreur demandera avant toute offre.",
    });
  }

  return {
    prixEstime,
    prixBas: Math.round((prixEstime * (1 - rangePct)) / 1000) * 1000,
    prixHaut: Math.round((prixEstime * (1 + rangePct)) / 1000) * 1000,
    prixM2: prixM2Final,
    prixM2Marche,
    deltaMarche,
    surface,
    fiabilite,
    fiabiliteScore,
    scoreAttractivite: score,
    delaiVente: `${delaiBase[0]}–${delaiBase[1]} jours`,
    tensionMarche,
    facteurs,
    recommandations: recommandations.slice(0, 3),
  };
}

/* ------------------------------------------------------------------ */
/* BIEN ATYPIQUE                                                       */
/* ------------------------------------------------------------------ */

/**
 * Rapport entre le prix du m² du bien et celui du résidentiel local.
 *
 * Un château se vend très en dessous du m² local (surfaces immenses, charges
 * lourdes, clientèle étroite) ; un loft ou une maison d'architecte au-dessus.
 */
const ATYPIQUE_TYPE_MULT: Record<string, { mult: number; label: string }> = {
  architecte: { mult: 1.25, label: "Maison d'architecte" },
  loft: { mult: 1.15, label: "Loft" },
  gite: { mult: 0.85, label: "Gîte / chambres d'hôtes" },
  autre: { mult: 0.85, label: "Bien atypique" },
  longere: { mult: 0.8, label: "Longère" },
  moulin: { mult: 0.7, label: "Moulin" },
  manoir: { mult: 0.65, label: "Manoir / demeure de caractère" },
  ferme: { mult: 0.6, label: "Corps de ferme" },
  religieux: { mult: 0.6, label: "Bâtiment religieux converti" },
  chateau: { mult: 0.45, label: "Château" },
  grange: { mult: 0.4, label: "Grange à réhabiliter" },
};

const CARACTERE_POIDS: Record<string, number> = {
  vue_exceptionnelle: 0.03,
  parc: 0.02,
  architecture_remarquable: 0.02,
  piscine: 0.015,
  etang: 0.015,
  grands_volumes: 0.012,
  hauteur_plafond: 0.012,
  jardin_remarquable: 0.012,
  riviere: 0.01,
  foret: 0.01,
  chapelle: 0.01,
  ecuries: 0.01,
  cheminees_monumentales: 0.01,
  escalier_honneur: 0.01,
  cave_voutee: 0.008,
  charpente_ancienne: 0.008,
  parquets_anciens: 0.008,
  pierre_taille: 0.008,
  colombages: 0.008,
  verriere: 0.008,
  orangerie: 0.008,
  logement_gardien: 0.008,
  spa: 0.008,
  cave_vin: 0.006,
  ascenseur: 0.006,
  domotique_hdg: 0.006,
  atelier: 0.006,
  pigeonnier: 0.006,
  tomettes: 0.005,
  terres_agricoles: 0.005,
  heliport: 0.005,
};
const CARACTERE_CAP = 0.2;

/**
 * Postes techniques d'un bien d'exception et coût relatif de leur reprise.
 * Source unique : le formulaire lit cette table pour construire ses questions,
 * de sorte qu'un poste renommé ne puisse pas rendre son malus inopérant.
 */
const ATYPIQUE_POSTE_MALUS: Record<string, number> = {
  "Structure / gros œuvre": 0.08,
  Toiture: 0.07,
  Façade: 0.05,
  "Réseaux (eau, électricité)": 0.04,
  Chauffage: 0.03,
  Isolation: 0.03,
  Menuiseries: 0.03,
};

export const POSTES_ATYPIQUE = Object.keys(ATYPIQUE_POSTE_MALUS);

const CADRE_MULT: Record<string, number> = {
  "Bord de mer": 1.12,
  "Centre-ville": 1.08,
  Montagne: 1.05,
  "Bourg / petite ville": 1.02,
  Village: 1,
  "Périphérie de ville": 1,
  "Pleine campagne": 0.95,
};

const ATYPIQUE_POTENTIEL_BONUS: Record<string, { bonus: number; label: string }> = {
  evenementiel: { bonus: 0.07, label: "événementiel" },
  gites: { bonus: 0.06, label: "création de gîtes" },
  division: { bonus: 0.06, label: "division possible" },
  chambres_hotes: { bonus: 0.05, label: "chambres d'hôtes" },
  rehabilitation: { bonus: 0.05, label: "réhabilitation de dépendances" },
  locatif_saisonnier: { bonus: 0.05, label: "location saisonnière" },
  equestre: { bonus: 0.04, label: "activité équestre" },
  changement_destination: { bonus: 0.03, label: "changement de destination" },
  exploitation_agricole: { bonus: 0.03, label: "exploitation agricole" },
};
const ATYPIQUE_POTENTIEL_CAP = 0.25;

const ATYPIQUE_CONTRAINTE_MALUS: Record<string, { malus: number; label: string }> = {
  risques_naturels: { malus: 0.06, label: "risques naturels" },
  contraintes_exploitation: { malus: 0.06, label: "contraintes d'exploitation" },
  abf: { malus: 0.05, label: "avis ABF obligatoire" },
  droit_passage: { malus: 0.04, label: "droit de passage" },
  natura2000: { malus: 0.04, label: "Natura 2000" },
  obligation_ouverture: { malus: 0.04, label: "obligation d'ouverture au public" },
  servitudes: { malus: 0.03, label: "servitudes" },
};

/**
 * Surface pondérée d'un bien d'exception.
 *
 * Au-delà d'une surface de résidence courante, chaque mètre carré
 * supplémentaire se vend beaucoup moins cher : il coûte à chauffer et à
 * entretenir sans élargir la clientèle. Sans ce palier, un château de 900 m²
 * ressortirait à neuf fois le prix d'une maison de 100 m².
 */
function surfacePondereeAtypique(surface: number): number {
  const palier1 = Math.min(surface, 200);
  const palier2 = Math.min(Math.max(surface - 200, 0), 300) * 0.55;
  const palier3 = Math.max(surface - 500, 0) * 0.3;
  return palier1 + palier2 + palier3;
}

function computeAtypiqueEstimation(form: LeenkeyForm, dvfPrixM2?: number | null): EstimationResult {
  const typeEntry = ATYPIQUE_TYPE_MULT[form.atypique_type ?? "autre"] ?? ATYPIQUE_TYPE_MULT.autre;
  const surface = form.surface_habitable || 0;
  const dependances = form.surface_dependances ?? 0;

  const baseResidentiel = melangeAvecDvf(dvfPrixM2, basePrixM2(form));
  const prixM2Marche = Math.round(baseResidentiel * typeEntry.mult);

  // ── Caractères exceptionnels ──
  let caractereSomme = 0;
  for (const c of form.caracteres_exceptionnels) {
    caractereSomme += CARACTERE_POIDS[c] ?? 0.005;
  }
  const caractereMult = 1 + Math.min(caractereSomme, CARACTERE_CAP);

  // ── État technique ──
  let travauxMalus = 0;
  const postesARefaire: string[] = [];
  for (const [poste, malus] of Object.entries(ATYPIQUE_POSTE_MALUS)) {
    if (form.travaux_recents.includes(poste)) continue;
    const etat = form.etat_technique[poste];
    if (etat === "À refaire") {
      travauxMalus += malus;
      postesARefaire.push(poste.toLowerCase());
    } else if (etat === "Moyen") {
      travauxMalus += malus / 2;
    }
  }
  travauxMalus = Math.min(travauxMalus, 0.3);
  // Quand le vendeur chiffre les travaux, ce montant fait foi : la décote au
  // pourcentage n'est plus là que pour le risque résiduel, sans quoi les
  // travaux seraient comptés deux fois.
  const budgetTravaux = form.travaux_budget ?? 0;
  const malusApplique = budgetTravaux > 0 ? travauxMalus / 2 : travauxMalus;
  const travauxMult = 1 - malusApplique;

  // Sur ce type de bien, un DPE défavorable est la norme et les acquéreurs
  // l'anticipent : l'effet est réel mais atténué par rapport à un logement
  // standard, où il surprend et fait fuir.
  const dpeAtypique = DPE_MULT[form.dpe ?? "inconnu"] ?? DPE_MULT.inconnu;
  const dpeMult = 1 + (dpeAtypique.mult - 1) * 0.5;

  // ── Environnement ──
  const cadreMult = CADRE_MULT[form.cadre ?? "Village"] ?? 1;
  const envMult =
    1 +
    (NIVEAU_BONUS[form.calme ?? "Moyen"] ?? 0) +
    (NIVEAU_BONUS[form.qualite_paysagere ?? "Moyen"] ?? 0) +
    (NIVEAU_BONUS[form.attractivite_touristique ?? "Moyen"] ?? 0) * 0.5;

  // L'acquéreur d'un bien d'exception vient souvent de loin : le temps de
  // trajet depuis une grande ville ou une gare compte davantage qu'ailleurs.
  let accesMult = 1;
  if (form.distances.grande_ville === "< 10 min") accesMult += 0.05;
  else if (form.distances.grande_ville === "> 1 h") accesMult -= 0.08;
  if (form.distances.gare === "< 10 min") accesMult += 0.03;
  else if (form.distances.gare === "> 1 h") accesMult -= 0.03;

  // ── Potentiel et contraintes ──
  let potentielSomme = 0;
  const potentielLabels: string[] = [];
  for (const p of form.potentiel_atypique) {
    const e = ATYPIQUE_POTENTIEL_BONUS[p];
    if (e) {
      potentielSomme += e.bonus;
      potentielLabels.push(e.label);
    }
  }
  const potentielMult = 1 + Math.min(potentielSomme, ATYPIQUE_POTENTIEL_CAP);

  let contrainteSomme = 0;
  const contrainteLabels: string[] = [];
  for (const c of form.contraintes_atypique) {
    const e = ATYPIQUE_CONTRAINTE_MALUS[c];
    if (e) {
      contrainteSomme += e.malus;
      contrainteLabels.push(e.label);
    }
  }
  const contrainteMult = 1 - Math.min(contrainteSomme, 0.25);

  // Le classement Monument Historique ouvre des avantages fiscaux et du
  // prestige, mais restreint les travaux : l'effet net reste modeste.
  let classementMult = 1;
  if (form.classement.includes("monument_historique")) classementMult += 0.03;
  if (form.classement.includes("label_fondation")) classementMult += 0.01;

  const globalMult =
    caractereMult *
    travauxMult *
    cadreMult *
    envMult *
    accesMult *
    potentielMult *
    contrainteMult *
    classementMult *
    dpeMult;

  const prixM2 = Math.round(prixM2Marche * globalMult);

  // Bâti principal, avec paliers de surface.
  const valeurBati = prixM2 * surfacePondereeAtypique(surface);
  // Les dépendances sont du volume brut : une fraction du prix du bâti.
  const valeurDependances = prixM2 * 0.15 * dependances;
  // Le parc au-delà du jardin d'agrément se valorise en terre, pas en terrain
  // à bâtir : 25 hectares de bois ne valent pas 25 hectares de lotissement.
  const terrain = form.surface_terrain ?? 0;
  const valeurParc = Math.max(0, terrain - 2000) * basePrixM2Terrain(form) * 0.08;

  const valeurPatrimoniale = valeurBati + valeurDependances + valeurParc;

  // ── Exploitation existante ──
  // Un bien qui s'autofinance intéresse une clientèle d'exploitants, pas
  // seulement de résidents. On capitalise l'excédent à un taux élevé :
  // l'activité est plus risquée et moins liquide qu'un bail classique.
  const revenus = form.revenus_existants ?? 0;
  const coutAnnuel =
    (form.charges_atypique ?? 0) + (form.cout_entretien_annuel ?? 0) + (form.taxe_fonciere ?? 0);
  const excedent = revenus - coutAnnuel;
  const valeurExploitation = excedent > 0 ? excedent / 0.09 : 0;

  const valeurAvantTravaux =
    valeurExploitation > 0
      ? valeurPatrimoniale * 0.75 + valeurExploitation * 0.25
      : valeurPatrimoniale;

  const prixEstime = Math.max(0, Math.round((valeurAvantTravaux - budgetTravaux) / 1000) * 1000);
  const prixM2Final = surface > 0 ? Math.round(prixEstime / surface) : 0;
  const deltaMarche = Math.round(((prixM2Final - prixM2Marche) / prixM2Marche) * 100);

  const facteurs: FactorImpact[] = [
    {
      label: "Nature du bien",
      impact: Math.round((typeEntry.mult - 1) * 100),
      detail: `${typeEntry.label} · référence ${prixM2Marche.toLocaleString("fr-FR")} €/m²`,
    },
    {
      label: "Caractères exceptionnels",
      impact: Math.round((caractereMult - 1) * 100),
      detail: `${form.caracteres_exceptionnels.length} élément${form.caracteres_exceptionnels.length > 1 ? "s" : ""} d'exception déclaré${form.caracteres_exceptionnels.length > 1 ? "s" : ""}`,
    },
    {
      label: "État & travaux",
      impact: -Math.round(malusApplique * 100),
      detail: budgetTravaux
        ? `${budgetTravaux.toLocaleString("fr-FR")} € de travaux déduits directement${postesARefaire.length ? ` · à reprendre : ${postesARefaire.join(", ")}` : ""}`
        : postesARefaire.length
          ? `À reprendre : ${postesARefaire.join(", ")}`
          : "Aucun poste majeur à reprendre",
    },
    {
      label: "Cadre & environnement",
      impact: Math.round((cadreMult * envMult - 1) * 100),
      detail: form.cadre ?? "Cadre non renseigné",
    },
    {
      label: "Accessibilité",
      impact: Math.round((accesMult - 1) * 100),
      detail: form.distances.grande_ville
        ? `Grande ville à ${form.distances.grande_ville}`
        : "Non renseignée",
    },
    {
      label: "Potentiel d'exploitation",
      impact: Math.round((potentielMult - 1) * 100),
      detail: potentielLabels.length ? potentielLabels.join(", ") : "Usage résidentiel seul",
    },
    {
      label: "Contraintes",
      impact: -Math.round(Math.min(contrainteSomme, 0.25) * 100),
      detail: contrainteLabels.length ? contrainteLabels.join(", ") : "Aucune déclarée",
    },
    {
      label: "Performance énergétique",
      impact: Math.round((dpeMult - 1) * 100),
      detail: dpeAtypique.label,
    },
  ];

  if (surface > 200) {
    facteurs.push({
      label: "Effet de surface",
      impact: -Math.round((1 - surfacePondereeAtypique(surface) / surface) * 100),
      detail: `Au-delà de 200 m², chaque mètre carré supplémentaire se valorise moins : il coûte à entretenir sans élargir la clientèle`,
    });
  }
  if (valeurExploitation > 0) {
    facteurs.push({
      label: "Exploitation en place",
      impact: 0,
      detail: `${revenus.toLocaleString("fr-FR")} € de revenus − ${coutAnnuel.toLocaleString("fr-FR")} € de coûts = ${excedent.toLocaleString("fr-FR")} € d'excédent annuel — le bien s'autofinance, ce qui élargit nettement la clientèle`,
    });
  } else if (coutAnnuel > 0) {
    facteurs.push({
      label: "Coût de détention",
      impact: 0,
      detail: `${coutAnnuel.toLocaleString("fr-FR")} € par an d'entretien, taxe foncière et charges — un acquéreur l'intègre dans son budget`,
    });
  }

  const champsClés: Array<keyof LeenkeyForm> = [
    "adresse",
    "code_postal",
    "atypique_type",
    "surface_habitable",
    "annee_construction",
    "cadre",
  ];
  let complet = champsClés.filter((k) => {
    const v = form[k];
    return v !== null && v !== "" && v !== undefined;
  }).length;
  if (form.caracteres_exceptionnels.length) complet += 1;
  if (Object.keys(form.etat_technique).length) complet += 1;
  const fiabiliteScore = Math.round((complet / (champsClés.length + 2)) * 100);
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  const dvfExploitable = !!dvfPrixM2 && dvfPrixM2 > 0;
  const tensionMarche = tension(form);
  const rangePct = fourchette({
    type: form.type,
    fiabilite,
    tension: tensionMarche,
    dvfExploitable,
  });

  let score = 50;
  score += Math.round((caractereMult - 1) * 150);
  score += Math.round((potentielMult - 1) * 100);
  score -= Math.round(malusApplique * 120);
  score -= Math.round(Math.min(contrainteSomme, 0.25) * 80);
  if (excedent > 0) score += 8;
  score = Math.max(0, Math.min(100, score));

  // Un bien d'exception se vend lentement : la clientèle est nationale, voire
  // internationale, et se compte en dizaines d'acquéreurs, pas en centaines.
  let delaiBase: [number, number] = [180, 360];
  if (form.atypique_type === "chateau") delaiBase = [300, 540];
  else if (form.atypique_type === "loft" || form.atypique_type === "architecte")
    delaiBase = [90, 180];
  if (form.classement.includes("monument_historique"))
    delaiBase = [delaiBase[0] + 60, delaiBase[1] + 90];
  if (excedent > 0) delaiBase = [Math.round(delaiBase[0] * 0.8), Math.round(delaiBase[1] * 0.8)];

  const recommandations: Recommendation[] = [];
  if (postesARefaire.length && !budgetTravaux) {
    recommandations.push({
      title: "Chiffrer les travaux avant la mise en vente",
      description: `Des postes majeurs sont à reprendre (${postesARefaire.slice(0, 3).join(", ")}). Sans devis, l'acquéreur retiendra toujours l'hypothèse haute et la déduira de son offre.`,
      uplift: "+5 à 12%",
    });
  }
  if (!form.potentiel_atypique.length) {
    recommandations.push({
      title: "Faire étudier le potentiel d'exploitation",
      description:
        "Gîtes, chambres d'hôtes, événementiel : un bien capable de générer des revenus s'adresse à une clientèle bien plus large qu'une simple résidence secondaire.",
      uplift: "+8 à 15%",
    });
  }
  if (excedent <= 0 && coutAnnuel > 0) {
    recommandations.push({
      title: "Documenter le coût réel de détention",
      description: `Entretien, taxe foncière et charges représentent ${coutAnnuel.toLocaleString("fr-FR")} € par an. Un budget présenté et maîtrisé rassure ; un budget flou fait fuir.`,
    });
  }
  if (form.caracteres_exceptionnels.length < 5) {
    recommandations.push({
      title: "Faire réaliser un reportage photo professionnel",
      description:
        "Sur ce type de bien, la vente se joue sur l'émotion et une clientèle éloignée. Photos, drone et visite virtuelle ne sont pas un supplément, ce sont l'outil de vente principal.",
      uplift: "+3 à 8%",
    });
  }
  if (recommandations.length < 3) {
    recommandations.push({
      title: "Constituer le dossier historique et technique",
      description:
        "Plans, historique du bien, factures de travaux, diagnostics, arrêté de classement : sur un bien d'exception, le dossier fait partie du produit.",
    });
  }

  return {
    prixEstime,
    prixBas: Math.round((prixEstime * (1 - rangePct)) / 1000) * 1000,
    prixHaut: Math.round((prixEstime * (1 + rangePct)) / 1000) * 1000,
    prixM2: prixM2Final,
    prixM2Marche,
    deltaMarche,
    surface,
    fiabilite,
    fiabiliteScore,
    scoreAttractivite: score,
    delaiVente: `${delaiBase[0]}–${delaiBase[1]} jours`,
    tensionMarche,
    facteurs,
    recommandations: recommandations.slice(0, 3),
  };
}

export function computeEstimation(
  formBrut: LeenkeyForm,
  dvfPrixM2?: number | null,
): EstimationResult {
  // Un brouillon restauré depuis le navigateur peut dater d'avant l'ajout d'un
  // champ : le compléter ici protège toutes les branches d'un coup, plutôt que
  // d'égrener des accès optionnels dans chaque modèle.
  const form = { ...initialForm, ...formBrut };
  // Un terrain n'a ni surface habitable, ni DPE, ni prestations : il a son
  // propre modèle, fondé sur la constructibilité et la viabilisation.
  if (form.type === "terrain") return computeTerrainEstimation(form);
  // Un local commercial se valorise à l'emplacement et au rendement locatif.
  if (form.type === "local_commercial") return computeLocalEstimation(form, dvfPrixM2);
  // Un immeuble de rapport se valorise à son revenu net, lot par lot.
  if (form.type === "immeuble") return computeImmeubleEstimation(form, dvfPrixM2);
  // Un bien d'exception n'a presque pas de comparables : caractères, état réel
  // et potentiel d'exploitation priment sur le prix au mètre carré.
  if (form.type === "atypique") return computeAtypiqueEstimation(form, dvfPrixM2);

  const surface = form.surface_habitable || form.surface_carrez || 60;

  const prixM2Table = basePrixM2(form);
  const prixM2Marche = melangeAvecDvf(dvfPrixM2, prixM2Table);

  // Multiplicateurs
  const typeMult = TYPE_MULT[form.type ?? "maison"] ?? 1;
  const etatEntry = ETAT_MULT[form.etat ?? "bon"] ?? ETAT_MULT.bon;
  const dpeEntry = DPE_MULT[form.dpe ?? "inconnu"] ?? DPE_MULT.inconnu;

  // Extérieur — les superficies saisies modulent le barème de base : une
  // terrasse de 6 m² et une de 40 m² ne valent pas la même chose.
  let extMult = 1;
  const extDetail: string[] = [];

  const ajouteExt = (cle: string, base: number, libelle: string, reference?: number) => {
    if (!form.exterieur.includes(cle)) return;
    const saisi = form.exterieur_details?.[cle];
    const facteur = reference && saisi && saisi > 0 ? facteurTaille(saisi, reference) : 1;
    extMult += base * facteur;
    extDetail.push(saisi && saisi > 0 ? `${libelle} ${saisi} m²` : libelle);
  };

  ajouteExt("jardin", 0.04, "jardin", 250);
  ajouteExt("terrasse", 0.03, "terrasse", 20);
  ajouteExt("balcon", 0.015, "balcon", 8);
  ajouteExt("piscine", 0.05, "piscine", 35);
  ajouteExt("cave", 0.01, "cave", 12);
  ajouteExt("grenier", 0.01, "grenier", 25);
  ajouteExt("dependance", 0.02, "dépendance", 30);

  // ── Le terrain ──
  // Le prix au m² bâti est calibré sur des ventes réelles : il intègre déjà la
  // parcelle qui allait avec, 644 m² en médiane. Seul l'écart à cette parcelle
  // courante se traduit en euros, sans quoi le terrain se paierait deux fois.
  //
  // Mesuré à commune et gabarit constants sur 2 208 communes : agrandir la
  // parcelle au-delà de l'usage courant ne change quasiment rien au prix
  // (−0,7 % entre 900 et 2 000 m²), alors qu'une parcelle exiguë coûte 10 %.
  // Le marché paie la maison, pas les mètres carrés de pelouse — l'excédent
  // n'est donc valorisé qu'à une fraction du prix du foncier.
  let valeurTerrain = 0;
  const terrainDetail: string[] = [];
  if (form.type === "maison") {
    const prixTerrain = basePrixM2Terrain(form);
    const parcelle = form.surface_terrain ?? 0;
    if (parcelle > 0) {
      const excedent = Math.max(0, parcelle - TERRAIN_INCLUS);
      // Paliers très plats : les ventes ne montrent pas d'écart de prix entre
      // une parcelle courante et une grande. Le surplus vaut donc une fraction
      // du foncier, pas son prix — un jardin ne se vend pas au prix du lot à
      // bâtir. Une parcelle réellement détachable relève du terrain attenant,
      // valorisé plus haut, ci-dessous.
      const pondere =
        Math.min(excedent, 1500) * 0.06 +
        Math.max(0, Math.min(excedent - 1500, 3500)) * 0.03 +
        Math.max(0, excedent - 5000) * 0.015;
      valeurTerrain += pondere * prixTerrain;
      if (pondere > 0) terrainDetail.push(`${parcelle.toLocaleString("fr-FR")} m² de terrain`);
      // Une parcelle exiguë, en revanche, se paie : −10 % au plus, atteints à
      // 45 % de la parcelle courante. Décote progressive, pour qu'un mètre
      // carré de plus ne fasse jamais bondir l'estimation.
      if (parcelle < TERRAIN_INCLUS) {
        const manque = Math.min(1, (TERRAIN_INCLUS - parcelle) / (TERRAIN_INCLUS * 0.55));
        extMult -= 0.1 * manque;
      }
    }
    // Un terrain attenant est une parcelle supplémentaire, éventuellement
    // détachée : elle s'ajoute, mais se négocie moins bien qu'un jardin
    // attaché à la maison.
    const attenant = form.exterieur.includes("terrain_attenant")
      ? (form.exterieur_details?.terrain_attenant ?? 0)
      : 0;
    if (attenant > 0) {
      valeurTerrain += attenant * prixTerrain * 0.6;
      terrainDetail.push(`${attenant.toLocaleString("fr-FR")} m² attenants`);
    }
  }

  // Stationnement : chaque place compte, avec un rendement décroissant.
  for (const [cle, base, libelle] of [
    ["garage", 0.025, "garage"],
    ["box", 0.025, "box"],
    ["parking", 0.015, "parking"],
  ] as const) {
    if (!form.exterieur.includes(cle)) continue;
    const places = Math.max(1, Math.min(4, form.exterieur_details?.[cle] ?? 1));
    extMult += base * (1 + (places - 1) * 0.6);
    extDetail.push(places > 1 ? `${libelle} ${places} places` : libelle);
  }

  // Prestations
  let prestSomme = 0;
  let prestCount = 0;
  for (const p of form.prestations) {
    const poids = PRESTATION_POIDS[p];
    if (poids) {
      prestSomme += poids;
      prestCount += 1;
    }
  }
  const prestMult = 1 + Math.min(prestSomme, PRESTATION_CAP);

  // Étage / dernier étage
  let etageMult = 1;
  if (form.type === "appartement") {
    if (form.dernier_etage) etageMult += 0.02;
    if ((form.etage ?? 0) >= 3) etageMult += 0.01;
    if ((form.etage ?? 0) === 0) etageMult -= 0.02;
  }

  // Depuis 2023, vendre un logement classé F ou G impose un audit énergétique.
  // Son absence ne décote pas le bien en soi : elle bloque la signature, et
  // l'acquéreur la traite comme un risque.
  const passoire = form.dpe === "F" || form.dpe === "G";
  const auditManquant = passoire && form.audit_energetique === "Non réalisé";
  const auditMult = auditManquant ? 0.98 : 1;

  // Isolation, ventilation, équipements et travaux : ces postes étaient portés
  // par l'étape Prestations, ils sont désormais collectés à l'étape Énergie.
  const energieMult = 1 + impactEnergie(form);

  const globalMult =
    typeMult *
    etatEntry.mult *
    dpeEntry.mult *
    extMult *
    prestMult *
    etageMult *
    auditMult *
    energieMult;
  const prixM2 = Math.round(prixM2Marche * globalMult);
  // L'état du bien joue via etatMult et les postes à reprendre, pas par une
  // déduction en euros : le vendeur ne chiffre plus ses travaux ici.
  const prixEstime = Math.max(0, Math.round((prixM2 * surface + valeurTerrain) / 1000) * 1000);
  const deltaMarche = Math.round(((prixM2 - prixM2Marche) / prixM2Marche) * 100);

  // Score attractivité
  let score = 50;
  score += (etatEntry.mult - 1) * 200;
  score += (dpeEntry.mult - 1) * 200;
  score += (extMult - 1) * 200;
  score += Math.min(prestCount * 3, 15);
  if (form.type === "appartement" && form.dernier_etage) score += 4;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Fiabilité (complétude) — calculée AVANT la fourchette pour ajuster sa largeur
  const champsClés: Array<keyof LeenkeyForm> = [
    "type",
    "adresse",
    "code_postal",
    "ville",
    "surface_habitable",
    "pieces",
    "chambres",
    "etat",
    "dpe",
    "chauffage",
    "annee_construction",
  ];
  const complet = champsClés.filter((k) => {
    const v = form[k];
    return v !== null && v !== "" && v !== undefined;
  }).length;
  // Un DPE d'avant juillet 2021 relève de l'ancienne méthode : il n'est plus
  // opposable et sera refait avant la vente. Le multiplicateur DPE repose donc
  // sur une donnée incertaine — c'est la fiabilité qui en pâtit, pas le prix.
  const dpePerime = !!form.dpe && form.dpe !== "inconnu" && form.dpe_date === "Avant juillet 2021";
  const fiabiliteScore = Math.max(
    0,
    Math.round((complet / champsClés.length) * 100) - (dpePerime ? 15 : 0),
  );
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  const tensionMarcheTmp = tension(form);
  const rangePct = fourchette({
    type: form.type,
    fiabilite,
    tension: tensionMarcheTmp,
    dvfExploitable: !!dvfPrixM2 && dvfPrixM2 > 0,
  });

  const prixBas = Math.round((prixEstime * (1 - rangePct)) / 1000) * 1000;
  const prixHaut = Math.round((prixEstime * (1 + rangePct)) / 1000) * 1000;

  // Tension marché
  const tensionMarche = tensionMarcheTmp;

  // Délai
  let delaiBase: [number, number] = [60, 90];
  if (tensionMarche === "forte") delaiBase = [30, 50];
  else if (tensionMarche === "moderee") delaiBase = [45, 70];
  if (form.etat === "a_renover") delaiBase = [delaiBase[0] + 20, delaiBase[1] + 30];
  if (form.prix_souhaite && form.prix_souhaite > prixEstime * 1.1) {
    delaiBase = [delaiBase[0] + 15, delaiBase[1] + 25];
  }
  const delaiVente = `${delaiBase[0]}–${delaiBase[1]} jours`;

  // Facteurs
  const facteurs: FactorImpact[] = [
    {
      label: "Localisation",
      impact: deltaMarche === 0 ? 0 : Math.round(deltaMarche / 2),
      detail: `${form.ville || "Zone"} · ${prixM2Marche.toLocaleString("fr-FR")} €/m² moyen`,
    },
    {
      label: "État général",
      impact: Math.round((etatEntry.mult - 1) * 100),
      detail: etatEntry.label,
    },
    {
      label: "Performance énergétique",
      impact: Math.round((dpeEntry.mult * energieMult - 1) * 100),
      detail: dpeEntry.label,
    },
    {
      label: "Extérieur",
      impact: Math.round((extMult - 1) * 100),
      detail: extDetail.length ? extDetail.join(", ") : "Aucun extérieur renseigné",
    },
    {
      label: "Prestations",
      impact: Math.round((prestMult - 1) * 100),
      detail: prestCount
        ? `${prestCount} prestation${prestCount > 1 ? "s" : ""} premium`
        : "Standard",
    },
  ];
  if (valeurTerrain > 0) {
    facteurs.push({
      label: "Terrain",
      impact: Math.round((valeurTerrain / (prixM2 * surface)) * 100),
      detail: `${terrainDetail.join(" + ")} · ${(Math.round(valeurTerrain / 1000) * 1000).toLocaleString("fr-FR")} € ajoutés`,
    });
  }
  if (form.type === "appartement") {
    facteurs.push({
      label: "Étage & exposition",
      impact: Math.round((etageMult - 1) * 100),
      detail: form.dernier_etage ? "Dernier étage" : `Étage ${form.etage ?? "?"}`,
    });
  }

  // Recommandations
  const recommandations: Recommendation[] = [];
  if (form.dpe && ["E", "F", "G"].includes(form.dpe)) {
    recommandations.push({
      title: "Améliorer la performance énergétique",
      description: `Passer d'un DPE ${form.dpe} à un DPE C/D pourrait revaloriser votre bien.`,
      uplift: "+5 à 10%",
    });
  }
  if (form.etat === "a_renover" || form.etat === "moyen") {
    recommandations.push({
      title: "Rafraîchir avant mise en vente",
      description: "Peinture, sols et cuisine refaits accélèrent fortement la vente.",
      uplift: "+3 à 7%",
    });
  }
  if (!form.exterieur.length && form.type === "appartement") {
    recommandations.push({
      title: "Mettre en valeur les atouts manquants",
      description: "Soignez la luminosité et le home staging pour compenser l'absence d'extérieur.",
    });
  }
  if (form.prix_souhaite && form.prix_souhaite > prixEstime * 1.08) {
    recommandations.push({
      title: "Ajuster le prix de mise en vente",
      description: `Votre prix souhaité (${form.prix_souhaite.toLocaleString(
        "fr-FR",
      )} €) est au-dessus du marché. Un prix proche de l'estimation accélère la vente.`,
    });
  }
  if (recommandations.length < 3) {
    recommandations.push({
      title: "Préparer un dossier de vente complet",
      description:
        "Diagnostics à jour, factures de travaux, taxe foncière : un dossier complet rassure les acheteurs.",
    });
  }

  return {
    prixEstime,
    prixBas,
    prixHaut,
    prixM2,
    prixM2Marche,
    deltaMarche,
    surface,
    fiabilite,
    fiabiliteScore,
    scoreAttractivite: score,
    delaiVente,
    tensionMarche,
    facteurs,
    recommandations: recommandations.slice(0, 3),
  };
}

export function formatEUR(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}
