require('dotenv').config()
import fs from "fs";
import { SVG, registerWindow, Svg, Text } from '@svgdotjs/svg.js';
import fertilizer_bag from "./svg/bag";
import fetch from 'cross-fetch';
import contracts from "./contracts";
import { ethers } from "ethers";
import { Fertilizer } from "./generated";

///////////////////////////////// SVG Setup /////////////////////////////////

const { config, createSVGWindow } = require('svgdom');
const window = createSVGWindow();
const document = window.document;
config
  .setFontDir('./src/fonts')
  .setFontFamilyMappings({
    'FuturaPTMedium': 'FuturaPTMedium.ttf',
    // 'FuturaPTBold': 'FuturaPTBold.otf',
    // 'FuturaPTBook': 'FuturaPTBook.otf'
  })
  .preloadFonts()
registerWindow(window, document)


///////////////////////////////// Types /////////////////////////////////

type FertilizerToken = {
  id: number;
  supply: number;
  humidity: number;
  endBpf: number;
  startBpf: number;
  season: number;
}

type ExtraData = {
  bpfRemaining: number;
  pct: number;
  now: Date;
}

///////////////////////////////// Mock Data /////////////////////////////////

const mockData = {
  id: '',
  totalSupply: 0,
  season: 0,
  humidity: 0,
  bpf: 3_013_244,
  tokens: [
    {
      id: 6_000_000,
      supply: 1,
      humidity: 5,
      endBpf: 6_000_000,
      startBpf: 0,
      season: 6074,
    }
  ]
}

/////////////////////////////////// Subgraph ///////////////////////////////////

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/cujowolf/beanstalk';
const paginate_fertilizer = async (_season_gt: number) => {
  let results : FertilizerToken[] = []; 
  let season_gt = _season_gt;
  let max_requests = 100
  const page_size = 1000;
  let i = 0;
  while (true) {
    i += 1;
    console.log(`paginate: season >= ${season_gt}`)
    const result = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      body: JSON.stringify({
        query: `query($season_gt: Int!) {
          fertilizerTokens(where: { season_gt: $season_gt }, orderBy: season, orderDirection: asc, first: ${page_size}) {
            id
            supply
            humidity
            endBpf
            startBpf
            season
          }
        }`,
        variables: { season_gt }
      })
    })
    .then((r) => r.json() as unknown as { data: { fertilizerTokens: FertilizerToken[] } });
    /// add new tokens 
    const tokens = result.data.fertilizerTokens;
    results.push(...tokens);
    /// break if loaded all data
    if (tokens.length === 0 || tokens.length < page_size) break;
    season_gt = tokens[tokens.length - 1].season;
    /// failsafe: prevent infinite loops
    if (i >= max_requests) {
      console.error(`reached max requests: ${max_requests}`);
      break;
    }
  }
  console.log(`loaded ${results.length} tokens in ${i} queries`)
  return results;
}

const run_query = async () : Promise<[FertilizerToken[], ethers.BigNumber]> => {
  console.log(`Querying subgraph for Fertilizer data.`)
  return Promise.all([
    paginate_fertilizer(0),
    contracts.beanstalk.beansPerFertilizer(),
  ])
}

/////////////////////////////////// Utilities ///////////////////////////////////

const make_id = (id: string | number) => id.toString()

///////////////////////////////// Generate Image /////////////////////////////////

const WIDTH = 600;
const HEIGHT = 600;
const CONTENT_PADDING = 20;

const generate_image = (
  token: FertilizerToken,
  uri: string,
  data: ExtraData,
) => {
  const canvas = SVG(document.documentElement as HTMLElement) as Svg;
  
  // Background
  canvas.rect(WIDTH, HEIGHT).fill('white');

  // Progress
  const progressHeight = data.pct*HEIGHT;
  canvas.rect(WIDTH, progressHeight).x(0).y(HEIGHT - progressHeight).fill('#46B955').opacity(0.2);

  // Bag
  const g = canvas.group().translate(WIDTH/2 - 200/2, HEIGHT/2 - 363/2);
  g.svg(fertilizer_bag);
  
  // Text
  const group = canvas.group().size(WIDTH - CONTENT_PADDING/2, HEIGHT-CONTENT_PADDING/2);
  const PCT_COMPLETE_SIZE = 30;
  group.add(
    new Text({})
      .text(`Season ${token.season.toString()}`)
      .font('family', 'sans-serif')
      .font('size', 50)
      .x(20)
      .y(20)
  );
  group.add(
    new Text({}).font({
      family: `sans-serif`,
      size: PCT_COMPLETE_SIZE,
    }).text(`${(data.pct*100).toFixed(1)}% ?? ${(data.bpfRemaining/1E6).toFixed(2)} BPF remaining`).x(20).y(HEIGHT - (PCT_COMPLETE_SIZE + CONTENT_PADDING))
  );

  // Write
  fs.writeFileSync(
    `./dist/${uri}.svg`,
    canvas.svg().toString()
  );
}

///////////////////////////////// Generate Metadata /////////////////////////////////

const generate_metadata = (
  token: FertilizerToken,
  id: string,
  data: ExtraData,
) => {
  const metadata = {
    name: `Fertilizer - ${token.id}`,
    external_url: `https://fert.bean.money/${token.id}.html`,
    description: `A trusty constituent of any Farmer's toolbox, ERC-1155 FERT has been known to spur new growth on seemingly dead farms. Once purchased and deployed into fertile ground by Farmers, Fertilizer generates new Sprouts: future Beans yet to be repaid by Beanstalk in exchange for doing the work of Replanting the protocol.`,
    image: `https://fert.bean.money/fertilizer.png?${data.now.getTime()}`,
    attributes: [
      {
        trait_type: "Season",
        value: token.season
      },
      {
        trait_type: "Humidity",
        display_type: "boost_percentage",
        value: token.humidity*1,
      },
      {
        trait_type: "BPF Remaining",
        display_type: "boost_number",
        value: parseFloat((data.bpfRemaining/1E6).toFixed(2))
      },
      {
        trait_type: "Updated At",
        display_type: "date",
        value: Math.floor(data.now.getTime()/1000)
      },
    ]
  }
  fs.writeFileSync(
    `./dist/${id}.json`,
    JSON.stringify(metadata),
    'utf-8'
  );
  fs.writeFileSync(
    `./dist/${id}`,
    JSON.stringify(metadata),
    'utf-8'
  );
}

///////////////////////////////// Generate View /////////////////////////////////

const generate_view = (
  token: FertilizerToken,
  id: string,
  data: ExtraData,
) => {
  const uri = `https://fert.bean.money/${id}`;
  fs.writeFileSync(
    `./dist/${id}.html`,
    `
<html>
  <head><title>Fertilizer ${id}</title></head>
  <body>
    <h1>Fertilizer ${id}</h1>
    <p>Showing currently minted Fertilizer tokens. For more information, see <a href="https://bean.money">bean.money</a>.</p>
    <ul>
      <li>Season minted: ${(token.season)}</li>
      <li>Humidity: ${(token.humidity*1).toFixed(2)}%</li>
      <li>BPF Remaining: ${(data.bpfRemaining/1E6).toFixed(2)} of ${((token.id - token.startBpf)/1E6).toFixed(2)} (${(data.pct*100).toFixed(2)}%)</li>
      <li>Updated At: ${data.now.toLocaleString()}</li>
    </ul>
    <p></p>
    <p>
      Metadata: <a href="${uri}.json">${uri}.json</a><br/>
      Image: <a href="${uri}.svg">${uri}.svg</a><br/>
      OpenSea: <a href="https://opensea.io/assets/ethereum/0x402c84de2ce49af88f5e2ef3710ff89bfed36cb6/${id}" target="_blank" rel="noreferrer">${id}</a>
    </p>
    <p></p>
    <p style="font-size: 12px; opacity: 0.7;">Fertilizer is an ERC-1155 token. Its metadata will be updated to reflect the number of Beans remaining to be minted per Fertilizer (BPF). <a href="https://github.com/BeanstalkFarms/Fertilizer-Metadata" target="_blank" rel="noreferrer">View source</a> &middot; <a href="index.html">Home</a></p>
  </body>
</html>`.trim()
  )
}
///////////////////////////// Generate index //////////////////////////////

const generate_index = (tokens: FertilizerToken[]) => {
  fs.writeFileSync(
    `./dist/index.html`,
    `
<html>
  <head><title>Fertilizer</title></head>
  <body>
    <h1>Fertilizer</h1>
    <p>Showing currently minted Fertilizer tokens. For more information, see <a href="https://bean.money">bean.money</a>.</p>
    <ul>
      ${tokens.map((token) => {
        const uri = make_id(token.id);
        return `<li><a href="/${uri}.html">${uri}</a></li>`;
      }).join('')}
    </ul>
    <p></p>
    <p style="font-size: 12px; opacity: 0.7;">Fertilizer is an ERC-1155 token. Its metadata will be updated to reflect the number of Beans remaining to be minted per Fertilizer (BPF). <a href="https://github.com/BeanstalkFarms/Fertilizer-Metadata" target="_blank" rel="noreferrer">View source</a></p>
  </body>
</html>`.trim()
  )
}

///////////////////////////////// Execute /////////////////////////////////

const load = async () => {
  const [tokens, _bpf] = await run_query();
  const bpf = _bpf.toNumber();
  for(let i = 0; i < tokens.length; i++) {
    const token         = tokens[i];
    const id            = make_id(token.id);
    const bpfRemaining  = Math.max(token.endBpf - bpf, 0); // cap at endBpf
    const pct           = (bpf - token.startBpf) / (token.id - token.startBpf);
    console.log(`id = ${token.id} season = ${token.season} id = ${id} bpfRemaining = ${(bpfRemaining/1E6).toFixed(2)} pct = ${(pct*100).toFixed(2)}`);
    const data = {
      bpfRemaining,
      pct,
      now: new Date(),
    };
    generate_metadata(token, id, data);
    generate_view(token, id, data);
    generate_image(token, id, data);
  }
  generate_index(tokens);
  fs.copyFileSync('./src/img/fertilizer.png', './dist/fertilizer.png');
};

load();
