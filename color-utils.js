import "./Vibrant.min.js";
import { waitForImage } from "./utils.js";

/** @type {VibrantConstructor} */
export const Vibrant = window["Vibrant"];

/**
 * Creates a Vibrant object from the given image.
 * 
 * @param {HTMLImageElement} image
 * @returns {Promise<VibrantObj>}
 */
export async function getImageVibrant(image) {
    const loadedImage = await waitForImage(image);
    return new Vibrant(loadedImage, 96, 8); // Increased from 6 to 8 for more color options
}

/**
 * Attempts to get a valid swatch from the list in the defined order, returning `null` if none are valid.
 * 
 * @param {VibrantSwatches} swatchesObject 
 * @param {...keyof VibrantSwatches} swatches 
 * @returns {VibrantSwatch?}
 */
export function getValidSwatch(swatchesObject, ...swatches) {
    for (const swatch of swatches) {
        if (swatchesObject.hasOwnProperty(swatch) && swatchesObject[swatch]){
            return swatchesObject[swatch];
        }
    }

    return null;
}

/**
 * Gets the best available color from an image with smart fallback.
 * Tries Vibrant → Dominant → Muted → Average in order.
 * Filters out colors that are too dark, light, or desaturated.
 * 
 * @param {HTMLImageElement} image
 * @returns {Promise<[number, number, number]?>}
 */
export async function getSmartAvatarColor(image) {
    const vibrant = await getImageVibrant(image);
    const swatches = vibrant.swatches();
    
    // Try different swatches in order of preference, testing each for quality
    const swatchPriority = ["Vibrant", "DarkVibrant", "LightVibrant", "Muted", "DarkMuted", "LightMuted"];
    
    for (const swatchName of swatchPriority) {
        const swatch = swatches[swatchName];
        if (swatch) {
            const rgb = swatch.getRgb();
            if (isColorQualityGood(rgb)) {
                return rgb;
            }
        }
    }
    
    // If no good swatch found after trying all, calculate average color from palette
    return getAverageColorFromSwatches(swatches);
}

/**
 * Checks if a color has good quality for dialogue text.
 * Rejects colors that are too dark, too light, or too desaturated.
 * 
 * @param {[number, number, number]} rgb
 * @returns {boolean}
 */
function isColorQualityGood(rgb) {
    const [r, g, b] = rgb;
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Reject if too dark or too light
    if (luminance < 0.15 || luminance > 0.95) {
        return false;
    }
    
    // Calculate saturation
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Reject if too desaturated (grayish)
    if (saturation < 0.2) {
        return false;
    }
    
    return true;
}

/**
 * Gets average color from all available swatches, weighted by population.
 * This favors more dominant colors in the image.
 * 
 * @param {VibrantSwatches} swatches
 * @returns {[number, number, number]?}
 */
function getAverageColorFromSwatches(swatches) {
    const validSwatches = Object.values(swatches).filter(s => s !== null && s !== undefined);
    
    if (validSwatches.length === 0) {
        return null;
    }
    
    let totalR = 0, totalG = 0, totalB = 0;
    let totalPopulation = 0;
    
    // Weight each color by its population (how many pixels have this color)
    for (const swatch of validSwatches) {
        const [r, g, b] = swatch.getRgb();
        const population = swatch.getPopulation() || 1; // Fallback to 1 if undefined
        
        totalR += r * population;
        totalG += g * population;
        totalB += b * population;
        totalPopulation += population;
    }
    
    // Avoid division by zero
    if (totalPopulation === 0) {
        totalPopulation = 1;
    }
    
    return [
        Math.round(totalR / totalPopulation),
        Math.round(totalG / totalPopulation),
        Math.round(totalB / totalPopulation)
    ];
}