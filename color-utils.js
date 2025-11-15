import "./Vibrant.min.js";
import "./color-thief.umd.js"; // Add Color Thief import
import { waitForImage } from "./utils.js";
import { ExColor } from "./ExColor.js";

/** @type {VibrantConstructor} */
export const Vibrant = window["Vibrant"];
const ColorThief = window["ColorThief"];
const swatchCache = new Map();

// RGB to HSL conversion
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
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

// Classify color based on Vibrant.js criteria
function classifyColor(r, g, b) {
    const hsl = rgbToHsl(r, g, b);
    const saturation = hsl.s;
    const lightness = hsl.l;

    const isVibrant = saturation > 40;
    const vibrancyType = isVibrant ? 'Vibrant' : 'Muted';

    let lightnessType = '';
    if (lightness < 40) {
        lightnessType = 'Dark';
    } else if (lightness > 60) {
        lightnessType = 'Light';
    }

    return lightnessType ? `${lightnessType}${vibrancyType}` : vibrancyType;
}

/**
 * Takes a loaded image and downscales it onto a canvas for fast color analysis.
 * @param {HTMLImageElement} image The fully loaded source image.
 * @param {number} maxDimension The maximum width or height of the scaled-down canvas.
 * 1024: slower loading, accurate colors, 256: faster loading, less accurate colors
 * @returns {HTMLCanvasElement} A canvas element containing the downscaled image.
 */
function createDownscaledCanvas(image, maxDimension = 1024) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let width = image.width;
    let height = image.height;

    // Calculate the new dimensions to maintain aspect ratio
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
    
    // round the dimensions to the nearest whole number.
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    // Draw the image onto the canvas, which performs the resizing.
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
}

/**
 * Gets a palette from Color Thief, classifies each color into a Vibrant.js category,
 * and returns a swatch object.
 * @param {HTMLImageElement | HTMLCanvasElement} image The image or canvas to analyze.
 * @param {number} paletteSize The number of colors to extract.
 * @returns {Object.<string, Swatch>} A dictionary of classified swatches.
 */
function getColorThiefSwatches(image, paletteSize = 12) {
    const colorThief = new ColorThief();
    // Extract a larger palette of 12 colors
    const palette = colorThief.getPalette(image, paletteSize);
    
    const classifiedSwatches = {};
    const usedCategories = new Set();
    
    // Classify each color and assign it to the first available category slot
    for (const color of palette) {
        const classification = classifyColor(color[0], color[1], color[2]);
        
        // Only assign if this category hasn't been filled yet.
        // This ensures the first (and likely most dominant) color for a category wins.
        if (classification && !usedCategories.has(classification)) {
            classifiedSwatches[classification] = {
                // Color Thief gives RGB array, so we create a mock Swatch object
                getRgb: () => color,
                getHex: () => '#' + color.map(x => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                }).join(''),
            };
            usedCategories.add(classification);
        }
    }
    
    return classifiedSwatches;
}

async function getSwatchesFromImage(image) {
    await waitForImage(image);
    const cacheKey = image.src;
    if (swatchCache.has(cacheKey)) return swatchCache.get(cacheKey);

    const imageSourceForAnalysis = createDownscaledCanvas(image);

    // Get the initial results from Vibrant.js
    const vibrant = new Vibrant(imageSourceForAnalysis, 96, 8);
    let swatches = vibrant.swatches();
    
    // Define all the swatches we absolutely require
    const requiredSwatches = [
        'Vibrant', 'DarkVibrant', 'LightVibrant',
        'Muted', 'DarkMuted', 'LightMuted'
    ];

    // Check if any of the required swatches are missing from the result
    const isMissingSwatches = requiredSwatches.some(swatchName => !swatches[swatchName]);
    
    // If ANY swatch is missing, run the Color Thief fallback to fill the gaps
    if (isMissingSwatches) {
        try {
            // Get the classified swatches from our upgraded Color Thief function
            const colorThiefSwatches = getColorThiefSwatches(imageSourceForAnalysis, 12);
            
            // Create a new merged swatch object. Start with Vibrant.js results.
            const mergedSwatches = { ...swatches };

            // Intelligently fill in the blanks
            for (const swatchName of requiredSwatches) {
                // If the original swatches are missing this one,
                if (!mergedSwatches[swatchName] && colorThiefSwatches[swatchName]) {
                    mergedSwatches[swatchName] = colorThiefSwatches[swatchName];
                }
            }
            
            // The final result is the merged object
            swatches = mergedSwatches;

        } catch (err) {
            console.warn('Color Thief fallback failed:', err);
        }
    }
    
    swatchCache.set(cacheKey, swatches);

    if (swatchCache.size > 50) {
        const oldestKey = swatchCache.keys().next().value;
        swatchCache.delete(oldestKey);
    }
    
    return swatches;
}


function remapValue(value, fromMin, fromMax, toMin, toMax) {
    if (fromMax - fromMin === 0) return toMin;
    const percentage = (value - fromMin) / (fromMax - fromMin);
    return toMin + percentage * (toMax - toMin);
}


function adjustLightnessDynamically(l) {
    const minLightness = 0.40; // LOWERED from 0.30
    const pivotPoint = 0.50;

    if (l < pivotPoint) {
        return remapValue(l, 0, pivotPoint, minLightness, pivotPoint);
    }
    return l;
}


function adjustSaturationDynamically(s) {
    const minSaturation = 0.30; // LOWERED from 0.50
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
    if (!swatchName || swatchName === 'disabled') {
        return null;
    }
    
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