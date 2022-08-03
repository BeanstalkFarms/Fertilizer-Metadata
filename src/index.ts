import fs from "fs";
import { SVG, registerWindow, Svg, Text } from '@svgdotjs/svg.js';
import fertilizer_bag from "./svg/bag";

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
    }).text(`${(data.pct*100).toFixed(1)}% · ${(data.bpfRemaining/1E6).toFixed(2)} BPF remaining`).x(20).y(HEIGHT - (PCT_COMPLETE_SIZE + CONTENT_PADDING))
  );

  // Write
  fs.writeFileSync(
    `./out/${uri}.svg`,
    canvas.svg().toString()
  );
}

///////////////////////////////// Generate Metadata /////////////////////////////////

const generate_metadata = (
  token: FertilizerToken,
  uri: string,
  data: ExtraData,
) => {
  fs.writeFileSync(
    `./out/${uri}.json`,
    JSON.stringify({
      name: `Fertilizer ${token.id}`,
      description: `A trusty constituent of any Farmer's toolbox, ERC-1155 FERT has been known to spur new growth on seemingly dead farms. Once purchased and deployed into fertile ground by Farmers, Fertilizer generates new Sprouts: future Beans yet to be repaid by Beanstalk in exchange for doing the work of Replanting the protocol.`,
      image: `https://fert.bean.money/${uri}`,
      properties: {
        humidity:   (token.humidity*100),
        season:     token.season,
        remaining:  (data.bpfRemaining/1E6).toFixed(6)
      }
    }),
    'utf-8'
  );
}

///////////////////////////////// Execute /////////////////////////////////

const load = async () => {
  const query = mockData;
  for(let i = 0; i < query.tokens.length; i++) {
    const token = query.tokens[i];
    const uri   = token.id.toString(16).toLowerCase().padStart(64, "0");
    const bpfRemaining = Math.max(token.endBpf - query.bpf, 0); // cap at endBpf
    const pct   = (query.bpf - token.startBpf) / (token.id - token.startBpf);
    console.log(`id = ${token.id} season = ${token.season} uri = ${uri} bpfRemaining = ${(bpfRemaining/1E6).toFixed(2)} pct = ${(pct*100).toFixed(2)}`);
    const data = {
      bpfRemaining,
      pct,
    };
    generate_metadata(token, uri, data)
    generate_image(token, uri, data);
  }
};

load();
