const STATE_CENTER_COORDS = {
  Alabama: [32.8067, -86.7911],
  Alaska: [64.2008, -149.4937],
  Arizona: [34.0489, -111.0937],
  Arkansas: [34.9697, -92.3731],
  California: [36.7783, -119.4179],
  Colorado: [39.5501, -105.7821],
  Connecticut: [41.6032, -73.0877],
  Delaware: [38.9108, -75.5277],
  Florida: [27.6648, -81.5158],
  Georgia: [32.1574, -82.9071],
  Hawaii: [19.8968, -155.5828],
  Idaho: [44.0682, -114.742],
  Illinois: [40.6331, -89.3985],
  Indiana: [40.2672, -86.1349],
  Iowa: [41.878, -93.0977],
  Kansas: [39.0119, -98.4842],
  Kentucky: [37.8393, -84.27],
  Louisiana: [30.9843, -91.9623],
  Maine: [45.2538, -69.4455],
  Maryland: [39.0458, -76.6413],
  Massachusetts: [42.4072, -71.3824],
  Michigan: [44.3148, -85.6024],
  Minnesota: [46.7296, -94.6859],
  Mississippi: [32.3547, -89.3985],
  Missouri: [37.9643, -91.8318],
  Montana: [46.8797, -110.3626],
  Nebraska: [41.4925, -99.9018],
  Nevada: [38.8026, -116.4194],
  'New Hampshire': [43.1939, -71.5724],
  'New Jersey': [40.0583, -74.4057],
  'New Mexico': [34.5199, -105.8701],
  'New York': [42.9538, -75.5268],
  'North Carolina': [35.7596, -79.0193],
  'North Dakota': [47.5515, -101.002],
  Ohio: [40.4173, -82.9071],
  Oklahoma: [35.4676, -97.5164],
  Oregon: [43.8041, -120.5542],
  Pennsylvania: [41.2033, -77.1945],
  'Rhode Island': [41.5801, -71.4774],
  'South Carolina': [33.8361, -81.1637],
  'South Dakota': [43.9695, -99.9018],
  Tennessee: [35.5175, -86.5804],
  Texas: [31.9686, -99.9018],
  Utah: [39.321, -111.0937],
  Vermont: [44.5588, -72.5778],
  Virginia: [37.4316, -78.6569],
  Washington: [47.7511, -120.7401],
  'West Virginia': [38.5976, -80.4549],
  Wisconsin: [43.7844, -88.7879],
  Wyoming: [43.076, -107.2903],
};

const COUNTY_COORDS = {
  Alabama: {
    montgomery: [32.3668, -86.3],
    jefferson: [33.5186, -86.8104],
    madison: [34.7304, -86.5861],
  },
  Alaska: {
    anchorage: [61.2181, -149.9003],
    fairbanksnorthstar: [64.8378, -147.7164],
    matanuskasusitna: [61.6, -149.1],
  },
  Arizona: {
    maricopa: [33.2918, -112.4291],
    pima: [32.0575, -111.6661],
    yavapai: [34.6464, -112.4291],
  },
  Arkansas: {
    pulaski: [34.7465, -92.2896],
    benton: [36.3729, -94.2088],
    washington: [36.0687, -94.1403],
  },
  California: {
    losangeles: [34.0522, -118.2437],
    fresno: [36.7378, -119.7871],
    sacramento: [38.5816, -121.4944],
  },
  Colorado: {
    denver: [39.7392, -104.9903],
    weld: [40.4233, -104.7091],
    larimer: [40.5853, -105.0844],
  },
  Connecticut: {
    hartford: [41.7658, -72.6734],
    newhaven: [41.3083, -72.9279],
    fairfield: [41.1408, -73.2613],
  },
  Delaware: {
    newcastle: [39.6621, -75.5666],
    kent: [39.1582, -75.5244],
    sussex: [38.6776, -75.3154],
  },
  Florida: {
    miamidade: [25.7617, -80.1918],
    orange: [28.5383, -81.3792],
    hillsborough: [27.9506, -82.4572],
  },
  Georgia: {
    fulton: [33.749, -84.388],
    cobb: [33.9526, -84.5499],
    gwinnett: [33.9562, -84.0229],
  },
  Hawaii: {
    honolulu: [21.3069, -157.8583],
    maui: [20.7984, -156.3319],
    hawaii: [19.5429, -155.6659],
  },
  Idaho: {
    ada: [43.615, -116.2023],
    canyon: [43.6251, -116.7093],
    twinfalls: [42.5629, -114.4609],
  },
  Illinois: {
    cook: [41.8781, -87.6298],
    sangamon: [39.7817, -89.6501],
    peoria: [40.6936, -89.589],
  },
  Indiana: {
    marion: [39.7684, -86.1581],
    allen: [41.0793, -85.1394],
    hamilton: [40.0456, -86.0086],
  },
  Iowa: {
    polk: [41.5868, -93.625],
    linn: [41.9779, -91.6656],
    scott: [41.5236, -90.5776],
  },
  Kansas: {
    sedgwick: [37.6872, -97.3301],
    shawnee: [39.0473, -95.6752],
    johnson: [38.8814, -94.8191],
  },
  Kentucky: {
    jefferson: [38.2527, -85.7585],
    fayette: [38.0406, -84.5037],
    kenton: [39.039, -84.5666],
  },
  Louisiana: {
    eastbatonrouge: [30.4515, -91.1871],
    orleans: [29.9511, -90.0715],
    lafayette: [30.2241, -92.0198],
  },
  Maine: {
    cumberland: [43.6591, -70.2568],
    penobscot: [44.8012, -68.7778],
    york: [43.1617, -70.6473],
  },
  Maryland: {
    montgomery: [39.1547, -77.2405],
    princegeorges: [38.8307, -76.8483],
    baltimore: [39.2904, -76.6122],
  },
  Massachusetts: {
    middlesex: [42.467, -71.2874],
    worcester: [42.2626, -71.8023],
    essex: [42.6389, -70.8679],
  },
  Michigan: {
    wayne: [42.2791, -83.3362],
    kent: [42.9634, -85.6681],
    oakland: [42.5922, -83.3362],
  },
  Minnesota: {
    hennepin: [44.9778, -93.265],
    ramsey: [44.9537, -93.09],
    stearns: [45.5539, -94.17],
  },
  Mississippi: {
    hinds: [32.2988, -90.1848],
    harrison: [30.396, -88.8853],
    desoto: [34.8767, -89.9937],
  },
  Missouri: {
    jackson: [39.0997, -94.5786],
    stlouis: [38.627, -90.1994],
    greene: [37.2089, -93.2923],
  },
  Montana: {
    yellowstone: [45.7833, -108.5007],
    missoula: [46.8721, -113.994],
    gallatin: [45.677, -111.0429],
  },
  Nebraska: {
    douglas: [41.2565, -95.9345],
    lancaster: [40.8136, -96.7026],
    hall: [40.925, -98.342],
  },
  Nevada: {
    clark: [36.1699, -115.1398],
    washoe: [39.5296, -119.8138],
    elko: [40.8324, -115.7631],
  },
  'New Hampshire': {
    hillsborough: [42.7654, -71.4676],
    rockingham: [42.9956, -71.4548],
    merrimack: [43.2081, -71.5376],
  },
  'New Jersey': {
    bergen: [40.9263, -74.077],
    middlesex: [40.4862, -74.4518],
    essex: [40.7357, -74.1724],
  },
  'New Mexico': {
    bernalillo: [35.0844, -106.6504],
    donaana: [32.3199, -106.7637],
    santafe: [35.687, -105.9378],
  },
  'New York': {
    albany: [42.6526, -73.7562],
    erie: [42.8864, -78.8784],
    onondaga: [43.0481, -76.1474],
    monroe: [43.1566, -77.6088],
  },
  'North Carolina': {
    wake: [35.7796, -78.6382],
    mecklenburg: [35.2271, -80.8431],
    guilford: [36.0726, -79.792],
  },
  'North Dakota': {
    cass: [46.8772, -96.7898],
    burleigh: [46.8083, -100.7837],
    grandforks: [47.9253, -97.0329],
  },
  Ohio: {
    franklin: [39.9612, -82.9988],
    cuyahoga: [41.4993, -81.6944],
    hamilton: [39.1031, -84.512],
  },
  Oklahoma: {
    oklahoma: [35.4676, -97.5164],
    tulsa: [36.154, -95.9928],
    cleveland: [35.2226, -97.4395],
  },
  Oregon: {
    multnomah: [45.5152, -122.6784],
    marion: [44.9429, -123.0351],
    lane: [44.0521, -123.0868],
  },
  Pennsylvania: {
    allegheny: [40.4406, -79.9959],
    philadelphia: [39.9526, -75.1652],
    lancaster: [40.0379, -76.3055],
  },
  'Rhode Island': {
    providence: [41.824, -71.4128],
    kent: [41.7001, -71.4162],
    washington: [41.4562, -71.6676],
  },
  'South Carolina': {
    greenville: [34.8526, -82.394],
    richland: [34.0007, -81.0348],
    charleston: [32.7765, -79.9311],
  },
  'South Dakota': {
    minnehaha: [43.5446, -96.7311],
    pennington: [44.0805, -103.231],
    lincoln: [43.3014, -96.7859],
  },
  Tennessee: {
    davidson: [36.1627, -86.7816],
    shelby: [35.1495, -90.049],
    knox: [35.9606, -83.9207],
  },
  Texas: {
    harris: [29.7604, -95.3698],
    travis: [30.2672, -97.7431],
    lubbock: [33.5779, -101.8552],
  },
  Utah: {
    saltlake: [40.7608, -111.891],
    utah: [40.2338, -111.6585],
    davis: [41.0602, -111.9711],
  },
  Vermont: {
    chittenden: [44.4759, -73.2121],
    rutland: [43.61, -72.9726],
    washington: [44.2601, -72.5754],
  },
  Virginia: {
    fairfax: [38.8462, -77.3064],
    henrico: [37.505, -77.3324],
    chesterfield: [37.3771, -77.504],
  },
  Washington: {
    king: [47.6062, -122.3321],
    spokane: [47.6588, -117.426],
    yakima: [46.6021, -120.5059],
  },
  'West Virginia': {
    kanawha: [38.3498, -81.6326],
    berkeley: [39.4562, -77.9639],
    monongalia: [39.6295, -79.9559],
  },
  Wisconsin: {
    milwaukee: [43.0389, -87.9065],
    dane: [43.0731, -89.4012],
    brown: [44.5192, -88.0198],
  },
  Wyoming: {
    laramie: [41.1403, -104.8202],
    natrona: [42.8501, -106.3252],
    albany: [41.3114, -105.5911],
  },
};

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function resolveCountyCoordinates(state, county) {
  const stateCenters = STATE_CENTER_COORDS[state];

  if (!stateCenters) {
    return { lat: 39.8283, lng: -98.5795, usedFallback: true };
  }

  const stateCounties = COUNTY_COORDS[state] || {};
  const countyCoords = stateCounties[normalizeKey(county)];

  if (countyCoords) {
    return { lat: countyCoords[0], lng: countyCoords[1], usedFallback: false };
  }

  return { lat: stateCenters[0], lng: stateCenters[1], usedFallback: true };
}

export { STATE_CENTER_COORDS, COUNTY_COORDS };
