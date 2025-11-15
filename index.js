
import { eventSource, event_types, saveSettingsDebounced } from "../../../../script.js";

import { ExColor } from "./ExColor.js";
import { CharacterType, STCharacter } from "./STCharacter.js";
import { getSmartAvatarColor, getNarrationColor } from "./color-utils.js";
import { createColorSourceDropdown, createColorTextPickerCombo, createCheckboxWithLabel } from "./element-creators.js";
import { initializeSettings } from "./settings-utils.js";
import {
    expEventSource,
    exp_event_type,
    getAllPersonas,
    getCharacterBeingEdited,
    getCurrentCharacter,
    getCurrentGroupCharacters,
    getCurrentPersona,
    getMessageAuthor,
    isInAnyChat,
    isInCharacterChat,
    isInGroupChat
} from "./st-utils.js";
import { setInputColorPickerComboValue } from "./utils.js";

const DEFAULT_STATIC_DIALOGUE_COLOR_HEX = "#e18a24";
const DEFAULT_STATIC_DIALOGUE_COLOR_RGB = [225, 138, 36];

export const ColorizeSourceType = {
    AVATAR_SMART: "avatar_smart",
    CHAR_COLOR_OVERRIDE: "char_color_override",
    STATIC_COLOR: "static_color",
    DISABLED: "disabled"
};

const defaultCharColorSettings = {
    colorOverrides: {},
    colorNameText: false,
    quotationColorSource: "Vibrant",
    narrationRawColorSource: "disabled",
    narrationItalicColorSource: "disabled",
    narrationBoldColorSource: "disabled",
};

const defaultExtSettings = {
    charColorSettings: structuredClone(defaultCharColorSettings),
    personaColorSettings: structuredClone(defaultCharColorSettings),
};

const extName = "SillyTavern-Smart-Dialogue-Colorizer-Extended";
const extFolderPath = `scripts/extensions/third-party/${extName}`;
const extSettings = initializeSettings(extName, defaultExtSettings);

let charactersStyleSheet;
let personasStyleSheet;

async function getCharStyleString(stChar) {
    let styleHtml = "";
    const colorSettings = getSettingsForChar(stChar);
    const msgSelector = `.mes[sdc-author_uid="${stChar.uid}"]`;
    const avatar = stChar.getAvatarImage(); //gets more accurately without Thumbnail, however, it's slower.

    const quotationRgb = await getNarrationColor(avatar, colorSettings.quotationColorSource);
    if (quotationRgb) {
        const quotationColor = ExColor.fromRgb(quotationRgb);
        const hexColor = `#${quotationColor.toHex()}`;

        styleHtml += `
            ${msgSelector} .mes_text q { color: ${hexColor} !important; }
        `;

        if (colorSettings.colorNameText) {
            styleHtml += `
                ${msgSelector} .name_text { color: ${hexColor} !important; }
            `;
        }
    }

    const rawNarrationRgb = await getNarrationColor(avatar, colorSettings.narrationRawColorSource);
    if (rawNarrationRgb) {
        const rawNarrationColor = ExColor.fromRgb(rawNarrationRgb);
        const hexColor = `#${rawNarrationColor.toHex()}`;
        
        styleHtml += `
            ${msgSelector} .mes_text { color: ${hexColor} !important; }
        `;
    }

    const italicRgb = await getNarrationColor(avatar, colorSettings.narrationItalicColorSource);
    if (italicRgb) {
        const italicColor = ExColor.fromRgb(italicRgb);
        styleHtml += `
            ${msgSelector} .mes_text em, ${msgSelector} .mes_text i { color: #${italicColor.toHex()} !important; }
        `;
    }

    const boldRgb = await getNarrationColor(avatar, colorSettings.narrationBoldColorSource);
    if (boldRgb) {
        const boldColor = ExColor.fromRgb(boldRgb);
        styleHtml += `
            ${msgSelector} .mes_text strong, ${msgSelector} .mes_text b { color: #${boldColor.toHex()} !important; }
        `;
    }

    return styleHtml;
}

async function updateCharactersStyleSheet(characterList) {
    if (!characterList) {
        if (!isInAnyChat()) return;
        if (isInGroupChat()) characterList = getCurrentGroupCharacters();
        else if (isInCharacterChat()) characterList = [getCurrentCharacter()];
    }
    const stylesHtml = await Promise.all(characterList.map(char => getCharStyleString(char)));
    charactersStyleSheet.innerHTML = stylesHtml.join("");
}

async function updatePersonasStyleSheet(personaList) {
    personaList ??= getAllPersonas();
    const stylesHtml = await Promise.all(personaList.map(persona => getCharStyleString(persona)));
    personasStyleSheet.innerHTML = stylesHtml.join("");
}

function getSettingsForChar(charType) {
    if (charType instanceof STCharacter) charType = charType.type;
    switch (charType) {
        case CharacterType.CHARACTER: return extSettings.charColorSettings;
        case CharacterType.PERSONA: return extSettings.personaColorSettings;
        default: return structuredClone(defaultCharColorSettings);
    }
}

function getTextValidHexOrDefault(textboxValue, defaultValue) {
    const trimmed = textboxValue.trim();
    return ExColor.isValidHexString(trimmed) ? ExColor.getHexWithHash(trimmed) : defaultValue;
}

function addAuthorUidClassToMessage(message) {
    const attr = "sdc-author_uid";
    if (message.hasAttribute(attr)) return;
    const author = getMessageAuthor(message);
    if (author) message.setAttribute(attr, author.uid);
}

async function onCharacterSettingsUpdated() { await updateCharactersStyleSheet(); saveSettingsDebounced(); }
async function onPersonaSettingsUpdated() { await updatePersonasStyleSheet(); saveSettingsDebounced(); }
function onCharacterChanged(char) {
    const override = document.getElementById("sdc-char_color_override");
    setInputColorPickerComboValue(override, extSettings.charColorSettings.colorOverrides[char.avatarName]);
}
function onPersonaChanged(persona) {
    const override = document.getElementById("sdc-persona_color_override");
    setInputColorPickerComboValue(override, extSettings.personaColorSettings.colorOverrides[persona.avatarName]);
}

function createNarrationDropdown(id, label, tooltip, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'inline-drawer';
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    labelEl.title = tooltip;
    const select = document.createElement('select');
    select.id = id;
    select.className = 'text_pole';
    const options = {
        'disabled': 'Disabled', 'Vibrant': 'Vibrant', 'DarkVibrant': 'Dark Vibrant',
        'LightVibrant': 'Light Vibrant', 'Muted': 'Muted', 'DarkMuted': 'Dark Muted',
        'LightMuted': 'Light Muted',
    };
    for (const [value, text] of Object.entries(options)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    }
    $(select).on('change', onChange);
    wrapper.append(labelEl, select);
    return wrapper;
}

function initializeStyleSheets() {
    charactersStyleSheet = document.createElement('style');
    charactersStyleSheet.id = "sdc-chars_style_sheet";
    document.body.appendChild(charactersStyleSheet);
    personasStyleSheet = document.createElement('style');
    personasStyleSheet.id = "sdc-personas_style_sheet";
    document.body.appendChild(personasStyleSheet);
}

function initializeSettingsUI() {
    const extSettingsEl = document.getElementById("sdc-extension-settings");
    const createSettingsSection = (type, isPersona) => {
        const settings = isPersona ? extSettings.personaColorSettings : extSettings.charColorSettings;
        const onUpdate = isPersona ? onPersonaSettingsUpdated : onCharacterSettingsUpdated;
        
        const dialogueSettings = extSettingsEl.querySelector(`#sdc-${type}_dialogue_settings`);
        if (!dialogueSettings) return;

        dialogueSettings.innerHTML = '';

        const titleContainer = document.createElement('div');
        const titleLabel = document.createElement('label');
        const titleHeader = document.createElement('h4');
        const titleText = isPersona ? 'Persona Narration & Dialogue' : 'Character Narration & Dialogue';
        titleHeader.innerHTML = `${titleText}<span class="margin5 fa-solid fa-circle-info opacity50p"></span>`;
        titleLabel.appendChild(titleHeader);
        titleContainer.appendChild(titleLabel);
        dialogueSettings.appendChild(titleContainer);

        const narrationSection = document.createElement('div');
        narrationSection.className = 'narration-section';

        const quotationDropdown = createNarrationDropdown(`sdc-${type}_narration_quotation`, 'Quotation Marks', 'Sets the color for text inside "quotation marks".', e => { settings.quotationColorSource = $(e.target).val(); onUpdate(); });
        narrationSection.appendChild(quotationDropdown);

        const rawDropdown = createNarrationDropdown(`sdc-${type}_narration_raw`, 'Raw Text', 'Sets the base color for narration text.', e => { settings.narrationRawColorSource = $(e.target).val(); onUpdate(); });
        narrationSection.appendChild(rawDropdown);

        const italicDropdown = createNarrationDropdown(`sdc-${type}_narration_italic`, 'Italic Text', 'Overrides the base color for *italic* text.', e => { settings.narrationItalicColorSource = $(e.target).val(); onUpdate(); });
        narrationSection.appendChild(italicDropdown);

        const boldDropdown = createNarrationDropdown(`sdc-${type}_narration_bold`, 'Bold Text', 'Overrides the base color for **bold** text.', e => { settings.narrationBoldColorSource = $(e.target).val(); onUpdate(); });
        narrationSection.appendChild(boldDropdown);

        dialogueSettings.appendChild(narrationSection);

        const nameCheckbox = createCheckboxWithLabel(
            `sdc-${type}_color_name`, 
            `Apply color to ${type} names`, 
            `When enabled, the character's name will use the color selected for "Quotation Marks".`, 
            settings.colorNameText, 
            checked => { settings.colorNameText = checked; onUpdate(); }
        );
        dialogueSettings.appendChild(nameCheckbox);

        $(quotationDropdown.querySelector('select')).val(settings.quotationColorSource);
        $(rawDropdown.querySelector('select')).val(settings.narrationRawColorSource);
        $(italicDropdown.querySelector('select')).val(settings.narrationItalicColorSource);
        $(boldDropdown.querySelector('select')).val(settings.narrationBoldColorSource);
    };

    createSettingsSection('char', false);
    createSettingsSection('persona', true);
}

function initializeCharSpecificUI() {
    const createOverrideElem = (id, getter) => {
        const wrapper = document.createElement('div');
        wrapper.id = id;
        wrapper.className = "dc-flex-container";
        const hr = document.createElement('hr');
        hr.className = "sysHR";
        const label = document.createElement('label');
        label.htmlFor = id;
        label.title = "Overrides the global dialogue color setting for this character.";
        label.innerHTML = `Dialogue Color<span class="margin5 fa-solid fa-circle-info opacity50p"></span>`;
        const picker = createColorTextPickerCombo(val => getTextValidHexOrDefault(val, ""), color => {
            const char = getter();
            const settings = getSettingsForChar(char);
            if (color) settings.colorOverrides[char.avatarName] = color;
            else delete settings.colorOverrides[char.avatarName];
            if (char.type === CharacterType.PERSONA) onPersonaSettingsUpdated();
            else onCharacterSettingsUpdated();
        });
        wrapper.append(hr, label, picker);
        return wrapper;
    };
    const charOverride = createOverrideElem("sdc-char_color_override", getCharacterBeingEdited);
    document.getElementById("avatar-and-name-block").insertAdjacentElement("afterend", charOverride);
    const personaOverride = createOverrideElem("sdc-persona_color_override", getCurrentPersona);
    personaOverride.removeChild(personaOverride.querySelector("hr.sysHR"));
    document.getElementById("persona_description").parentElement.insertAdjacentElement("afterbegin", personaOverride);
}

jQuery(async ($) => {
    const settingsHtml = await $.get(`${extFolderPath}/dialogue-colorizer.html`);
    $("#extensions_settings2").append(settingsHtml);
    initializeStyleSheets();
    initializeSettingsUI();
    initializeCharSpecificUI();
    eventSource.on(event_types.CHAT_CHANGED, () => updateCharactersStyleSheet());
    expEventSource.on(exp_event_type.MESSAGE_ADDED, addAuthorUidClassToMessage);
    expEventSource.on(exp_event_type.CHAR_CARD_CHANGED, onCharacterChanged);
    expEventSource.on(exp_event_type.PERSONA_CHANGED, onPersonaChanged);
    eventSource.once(event_types.APP_READY, () => {
        if (isInAnyChat()) {
            onCharacterChanged(getCharacterBeingEdited());
            updateCharactersStyleSheet();
        }
        onPersonaChanged(getCurrentPersona());
        updatePersonasStyleSheet();
    });
});
