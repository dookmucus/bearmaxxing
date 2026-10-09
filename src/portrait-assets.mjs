import {heroReferenceName} from './hero-identity.mjs';
// Figma frame 16:403 supplied the original portraits. Gordon, Forrest and
// Jaeger and the Gen 7 heroes use the user's supplied portraits.
export const HERO_PORTRAITS = {
  Yang:'yang.png', Olive:'olive.png', Sophia:'sophia.png', Triton:'triton.png',
  Seth:'seth.png', Quinn:'quinn.png', Thrud:'thrud.png', Zoe:'zoe.png',
  'Long Fei':'long-fei.png', Alcar:'alcar.png', Edwin:'edwin.png', Gordon:'gordon.png',
  Howard:'howard.png', Forrest:'forrest.png', Jaeger:'jaeger.png',
  Vivian:'vivian.png', Marlin:'marlin.png', Rosa:'rosa.png', Saul:'saul.png',
  Fahd:'fahd.png', Chenko:'chenko.png', Yeonwoo:'yeonwoo.png', Diana:'diana.png',
  Jabel:'jabel.png', Amane:'amane.png', Amadeus:'amadeus.png', Eric:'eric.png',
  Helga:'helga.png', Hilde:'hilde.png', Petra:'petra.png', Margot:'margot.png',
  Charles:'charles.png', Ava:'ava.png', 'Wee & Woo':'wee-woo.png'
};
export const heroPortraitFile=hero=>HERO_PORTRAITS[heroReferenceName(hero)]??null;

export const PET_PORTRAITS = {
  'Gray Wolf':'gray-wolf.png', Lynx:'lynx.png', Bison:'bison.png',
  Cheetah:'cheetah.png', Moose:'moose.png', Lion:'lion.png',
  'Grizzly Bear':'grizzly-bear.png', 'Giant Rhino':'giant-rhino.png',
  'Mighty Bison':'mighty-bison.png', 'Great Moose':'great-moose.png',
  'Alpha Black Panther':'alpha-black-panther.png', 'Regal White Lion':'regal-white-lion.png',
  'Ironclad War Elephant':'ironclad-war-elephant.png', 'Ironclad War Bear':'ironclad-war-bear.png'
};
