import "https://cdn.jsdelivr.net/npm/node-vibrant@3.2.1-alpha.1/dist/vibrant.min.js";
import "https://cdn.jsdelivr.net/npm/colorthief@2.6.0/dist/color-thief.umd.js";

import { waitForImage } from "./utils.js";
import { ExColor } from "./ExColor.js";

/** @type {any} */
export const Vibrant = window["Vibrant"];
const ColorThief = window["ColorThief"];
const swatchCache = new Map();



function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) h = s = 0;
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function doesColorFitProfile(r, g, b, profile) {
    const hsl = rgbToHsl(r, g, b);
    const s = hsl.s, l = hsl.l;
    
    const isSat = s >= 40; 
    const isDark = l < 40;
    const isLight = l > 60;
    const isMid = l >= 40 && l <= 60;

    switch (profile) {
        case 'Vibrant': return isSat && (isMid || (l > 30 && l < 70));
        case 'Muted': return !isSat && (isMid || (l > 30 && l < 70));
        case 'DarkVibrant': return isSat && isDark;
        case 'DarkMuted': return !isSat && isDark;
        case 'LightVibrant': return isSat && isLight;
        case 'LightMuted': return !isSat && isLight;
        default: return false;
    }
}

/**
 * Takes a loaded image and downscales it onto a canvas for fast color analysis.
 * Example of values in maxDimensions:
 * 1024: Higher accuracy color extraction, slower loading speed;
 * 512: Lower accuracy color extraction, faster loading speed.
 */
function createDownscaledCanvas(image, maxDimension = 1024) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // use natural dimensions for images to avoid CSS scaling issues
    // and ensure we have numbers (default to 0 if undefined)
    let width = Number(image.naturalWidth || image.width || 0);
    let height = Number(image.naturalHeight || image.height || 0);

    // if image has no dimensions, return a 1x1 blank canvas to avoid NaN/Infinity
    if (width <= 0 || height <= 0) {
        canvas.width = 1;
        canvas.height = 1;
        return canvas;
    }

    if (width > height) {
        if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
        }
    } else {
        if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
        }
    }
    
    // ensuring it always have valid integers for canvas dimensions
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
}

async function getSwatchesFromImage(image) {
    if (!image) return {};
    
    try {
        await waitForImage(image);
    } catch (err) {
        console.warn('Failed to load image for color extraction:', err);
        return {};
    }

    const cacheKey = image.src;
    if (cacheKey && swatchCache.has(cacheKey)) return swatchCache.get(cacheKey);

    const canvas = createDownscaledCanvas(image);
    
    // If the canvas is effectively empty, don't bother processing
    if (canvas.width <= 1 && canvas.height <= 1) return {};
    
    try {
        // A. Run Vibrant.js (Async)
        const vibrantSwatches = await Vibrant.from(image).getPalette();

        // B. Run Color Thief
        // note: Color Thief expects naturalWidth/naturalHeight which canvases don't have.
        // Add them to the canvas object so Color Thief can process our downscaled version.
        canvas.naturalWidth = canvas.width;
        canvas.naturalHeight = canvas.height;
        const colorThief = new ColorThief();
        const thiefPalette = colorThief.getPalette(canvas, 15);

        // C. Create Composite (The Fallback Logic)
        const profiles = ['Vibrant', 'Muted', 'DarkVibrant', 'DarkMuted', 'LightVibrant', 'LightMuted'];
        const swatches = {};
        const usedHexes = new Set();

        // 1. Process Vibrant Results
        profiles.forEach(name => {
            if (vibrantSwatches[name]) {
                swatches[name] = vibrantSwatches[name];
                usedHexes.add(vibrantSwatches[name].getHex());
            }
        });

        // 2. Try to find a fallback in Color Thief for missing profiles
        profiles.forEach(name => {
            if (!swatches[name]) {
                let fallbackRgb = null;
                
                for (let rgb of thiefPalette) {
                    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
                    if (usedHexes.has(hex)) continue;

                    if (doesColorFitProfile(rgb[0], rgb[1], rgb[2], name)) {
                        fallbackRgb = rgb;
                        usedHexes.add(hex);
                        break;
                    }
                }

                if (fallbackRgb) {
                    swatches[name] = {
                        getRgb: () => fallbackRgb,
                        getHex: () => rgbToHex(fallbackRgb[0], fallbackRgb[1], fallbackRgb[2]),
                    };
                }
            }
        });

        swatchCache.set(cacheKey, swatches);
        if (swatchCache.size > 50) {
            const oldestKey = swatchCache.keys().next().value;
            swatchCache.delete(oldestKey);
        }
        return swatches;

    } catch (err) {
        console.error('Color extraction failed:', err);
        return {};
    }
}


function remapValue(value, fromMin, fromMax, toMin, toMax) {
    if (fromMax - fromMin === 0) return toMin;
    const percentage = (value - fromMin) / (fromMax - fromMin);
    return toMin + percentage * (toMax - toMin);
}

function adjustLightnessDynamically(l) {
    const minLightness = 0.50; 
    const pivotPoint = 0.50;
    if (l < pivotPoint) {
        return remapValue(l, 0, pivotPoint, minLightness, pivotPoint);
    }
    return l;
}

function adjustSaturationDynamically(s) {
    const minSaturation = 0.30; 
    const pivotPoint = 0.70;
    if (s < pivotPoint) {
        return remapValue(s, 0, pivotPoint, minSaturation, pivotPoint);
    }
    return s;
}

function ensureReadability(rgb) {
    if (!rgb) return null;
    const [h, s, l] = ExColor.rgb2hsl(rgb);
    const newL = adjustLightnessDynamically(l);
    const newS = adjustSaturationDynamically(s);
    if (newL !== l || newS !== s) {
        return ExColor.hsl2rgb([h, Math.min(1, newS), Math.min(1, newL)]);
    }
    return rgb;
}

function isColorQualityGood(rgb) {
    if (!rgb) return false;
    const [h, s, l] = ExColor.rgb2hsl(rgb);
    return s > 0.3 && l > 0.2 && l < 0.8;
}

export async function getNarrationColor(image, swatchName) {
    if (!swatchName || swatchName === 'disabled') return null;
    const swatches = await getSwatchesFromImage(image);
    const swatch = swatches[swatchName] || swatches["Vibrant"];
    if (swatch) {
        const rgb = swatch.getRgb();
        return ensureReadability(rgb);
    }
    return null;
}

export async function getSmartAvatarColor(image) {
    const swatches = await getSwatchesFromImage(image);
    const swatchPriority = ["Vibrant", "DarkVibrant", "Muted", "LightVibrant", "DarkMuted", "LightMuted"];
    let foundRgb = null;

    for (const swatchName of swatchPriority) {
        const swatch = swatches[swatchName];
        if (swatch) {
            const rgb = swatch.getRgb();
            if (isColorQualityGood(rgb)) {
                foundRgb = rgb;
                break;
            }
        }
    }
    
    if (!foundRgb) {
        for (const swatchName of swatchPriority) {
            if (swatches[swatchName]) {
                foundRgb = swatches[swatchName].getRgb();
                break;
            }
        }
    }
    return ensureReadability(foundRgb);
}