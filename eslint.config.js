import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    // Config de base pour tous les scripts
    {
        files: ["scripts/*.js", "roster/discordAuth.js"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "script",
            globals: {
                ...globals.browser,
                // Firebase CDN (chargé avant via <script>)
                firebase: "readonly",
            }
        },
        rules: {
            // Fonctions appelées depuis onclick HTML — pas détectables par ESLint
            "no-unused-vars": ["warn", {
                "vars": "all",
                "args": "none",
                "caughtErrorsIgnorePattern": "^_",
                "varsIgnorePattern": "^(DiscordAuth|NEWS|classSpecs|getClassName|getSpecIcon|showTooltip|hideTooltip|toggleManualForm|updateSpecs|updateFlexRole|submitForm|removePlayer|toggleAdminMode|editPlayer|refreshPlayerArmory|refreshAllPlayers|exportToCSV|exportToDiscord|startBattleNetAuth|togglePlay|seekAudio|openForm|closeForm)$"
            }],
            "no-undef": "error",
            "no-console": "off",
            "eqeqeq": ["warn", "always"],
        }
    },
    // roster.js utilise DiscordAuth défini dans discordAuth.js (chargé avant)
    {
        files: ["scripts/roster.js"],
        languageOptions: {
            globals: {
                DiscordAuth: "readonly",
            }
        }
    },
    // discordAuth.js a un guard CommonJS en fin de fichier
    {
        files: ["roster/discordAuth.js"],
        languageOptions: {
            globals: {
                module: "readonly"
            }
        }
    }
];
