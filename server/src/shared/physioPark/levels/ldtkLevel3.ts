// Generated from ../docs/planning/ldtkLevel3/level2.ldtk by scripts/convert-ldtk.mjs. Do not edit.
export const LDtkLevel = {
    "id": "Level_3",
    "name": "Level 3",
    "width": 702,
    "height": 227,
    "solids": [
        {
            "x": 0,
            "y": 208,
            "width": 104,
            "height": 24
        },
        {
            "x": 200,
            "y": 208,
            "width": 96,
            "height": 24
        },
        {
            "x": 496,
            "y": 208,
            "width": 208,
            "height": 24
        },
        {
            "x": 536,
            "y": 32,
            "width": 104,
            "height": 8
        },
        {
            "x": 600,
            "y": 40,
            "width": 16,
            "height": 64
        },
        {
            "x": 600,
            "y": 112,
            "width": 16,
            "height": 56
        },
        {
            "x": 600,
            "y": 104,
            "width": 40,
            "height": 8
        },
        {
            "x": 600,
            "y": 168,
            "width": 40,
            "height": 8
        },
        {
            "x": 672,
            "y": 72,
            "width": 32,
            "height": 8
        },
        {
            "x": 672,
            "y": 136,
            "width": 32,
            "height": 8
        },
        {
            "x": 672,
            "y": 200,
            "width": 32,
            "height": 8
        },
        {
            "x": 696,
            "y": 0,
            "width": 8,
            "height": 72
        },
        {
            "x": 696,
            "y": 80,
            "width": 8,
            "height": 56
        },
        {
            "x": 696,
            "y": 144,
            "width": 8,
            "height": 56
        },
        {
            "x": 672,
            "y": 64,
            "width": 24,
            "height": 8
        },
        {
            "x": 672,
            "y": 128,
            "width": 24,
            "height": 8
        },
        {
            "x": 672,
            "y": 192,
            "width": 24,
            "height": 8
        },
        {
            "x": 616,
            "y": 96,
            "width": 24,
            "height": 8
        },
        {
            "x": 616,
            "y": 160,
            "width": 24,
            "height": 8
        },
        {
            "x": -8,
            "y": -300,
            "width": 8,
            "height": 600
        },
        {
            "x": 702,
            "y": -300,
            "width": 8,
            "height": 600
        }
    ],
    "lavas": [
        {
            "x": 104,
            "y": 216,
            "width": 96,
            "height": 16
        },
        {
            "x": 296,
            "y": 216,
            "width": 200,
            "height": 16
        }
    ],
    "goalArea": {
        "x": 544,
        "y": 0,
        "width": 56,
        "height": 32
    },
    "boxes": [
        {
            "id": "be6be960-bde0-11f1-8f94-61014f1a8412",
            "x": 600,
            "y": 176,
            "width": 16,
            "height": 16
        },
        {
            "id": "bf991ec0-bde0-11f1-8f94-81064982e776",
            "x": 600,
            "y": 192,
            "width": 16,
            "height": 16
        }
    ],
    "goalFlagPosition": {
        "x": 572,
        "y": 32
    },
    "conveyors": [
        {
            "surface": {
                "x": 672,
                "y": 64,
                "width": 24,
                "height": 8
            },
            "pushSpeed": -28
        },
        {
            "surface": {
                "x": 672,
                "y": 128,
                "width": 24,
                "height": 8
            },
            "pushSpeed": -28
        },
        {
            "surface": {
                "x": 672,
                "y": 192,
                "width": 24,
                "height": 8
            },
            "pushSpeed": -28
        },
        {
            "surface": {
                "x": 616,
                "y": 96,
                "width": 24,
                "height": 8
            },
            "pushSpeed": 28
        },
        {
            "surface": {
                "x": 616,
                "y": 160,
                "width": 24,
                "height": 8
            },
            "pushSpeed": 28
        }
    ],
    "movingPlatforms": [
        {
            "id": "96b28df0-bde0-11f1-8f94-cb5640632e1d",
            "x": 120,
            "y": 224,
            "width": 24,
            "height": 24,
            "endX": 120,
            "endY": 184,
            "speed": 20,
            "type": "Stone",
            "movementType": "PingPong"
        },
        {
            "id": "75c11020-bde0-11f1-8f94-c7fe059b08f5",
            "x": 160,
            "y": 224,
            "width": 24,
            "height": 24,
            "endX": 160,
            "endY": 184,
            "speed": 20,
            "type": "Stone",
            "movementType": "PingPong"
        },
        {
            "id": "c68c2f00-bde0-11f1-8f94-c17f8e1c37c0",
            "x": 328,
            "y": 208,
            "width": 16,
            "height": 16,
            "endX": 464,
            "endY": 208,
            "speed": 30,
            "type": "Stone",
            "movementType": "Once"
        },
        {
            "id": "933a10a0-bde0-11f1-8f94-bdaf716be7af",
            "x": 440,
            "y": 176,
            "width": 16,
            "height": 16,
            "endX": 304,
            "endY": 176,
            "speed": 30,
            "type": "Stone",
            "movementType": "Once"
        }
    ],
    "switches": [
        {
            "id": "0a30bbb0-bde0-11f1-8f94-1dcecf8d9848",
            "x": 24,
            "y": 144,
            "width": 16,
            "height": 16,
            "player": 0,
            "target": "96b28df0-bde0-11f1-8f94-cb5640632e1d"
        },
        {
            "id": "0b979eb0-bde0-11f1-8f94-b95cd2131478",
            "x": 64,
            "y": 144,
            "width": 16,
            "height": 16,
            "player": 1,
            "target": "75c11020-bde0-11f1-8f94-c7fe059b08f5"
        },
        {
            "id": "90a418f0-bde0-11f1-8f94-e12a08d8bcf0",
            "x": 240,
            "y": 144,
            "width": 16,
            "height": 16,
            "player": 0,
            "target": "c68c2f00-bde0-11f1-8f94-c17f8e1c37c0"
        },
        {
            "id": "ad0bde00-bde0-11f1-8f94-1f56f573c9ca",
            "x": 536,
            "y": 144,
            "width": 16,
            "height": 16,
            "player": 1,
            "target": "933a10a0-bde0-11f1-8f94-bdaf716be7af"
        }
    ],
    "spawns": [
        {
            "x": 8,
            "y": 192
        }
    ],
    "tiles": [
        {
            "x": 696,
            "y": 0,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 8,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 16,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 24,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 536,
            "y": 32,
            "sourceX": 0,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 544,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 552,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 560,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 568,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 576,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 584,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 592,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 616,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 624,
            "y": 32,
            "sourceX": 8,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 632,
            "y": 32,
            "sourceX": 16,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 32,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 40,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 40,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 40,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 48,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 48,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 48,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 56,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 56,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 56,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 64,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 64,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 672,
            "y": 64,
            "sourceX": 0,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 680,
            "y": 64,
            "sourceX": 8,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 688,
            "y": 64,
            "sourceX": 40,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 64,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 72,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 72,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 672,
            "y": 72,
            "sourceX": 0,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 680,
            "y": 72,
            "sourceX": 8,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 688,
            "y": 72,
            "sourceX": 40,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 72,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 80,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 80,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 80,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 88,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 88,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 88,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 96,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 96,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 616,
            "y": 96,
            "sourceX": 0,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 624,
            "y": 96,
            "sourceX": 8,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 632,
            "y": 96,
            "sourceX": 40,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 96,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 104,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 104,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 616,
            "y": 104,
            "sourceX": 0,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 624,
            "y": 104,
            "sourceX": 8,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 632,
            "y": 104,
            "sourceX": 40,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 104,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 112,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 112,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 112,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 120,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 120,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 120,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 128,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 128,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 672,
            "y": 128,
            "sourceX": 0,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 680,
            "y": 128,
            "sourceX": 8,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 688,
            "y": 128,
            "sourceX": 40,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 128,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 136,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 136,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 672,
            "y": 136,
            "sourceX": 0,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 680,
            "y": 136,
            "sourceX": 8,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 688,
            "y": 136,
            "sourceX": 40,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 136,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 24,
            "y": 144,
            "sourceX": 56,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 32,
            "y": 144,
            "sourceX": 64,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 64,
            "y": 144,
            "sourceX": 56,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 72,
            "y": 144,
            "sourceX": 64,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 240,
            "y": 144,
            "sourceX": 56,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 248,
            "y": 144,
            "sourceX": 64,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 536,
            "y": 144,
            "sourceX": 56,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 544,
            "y": 144,
            "sourceX": 64,
            "sourceY": 24,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 144,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 144,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 144,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 24,
            "y": 152,
            "sourceX": 56,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 32,
            "y": 152,
            "sourceX": 64,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 64,
            "y": 152,
            "sourceX": 56,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 72,
            "y": 152,
            "sourceX": 64,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 240,
            "y": 152,
            "sourceX": 56,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 248,
            "y": 152,
            "sourceX": 64,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 536,
            "y": 152,
            "sourceX": 56,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 544,
            "y": 152,
            "sourceX": 64,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 152,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 152,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 152,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 40,
            "y": 160,
            "sourceX": 64,
            "sourceY": 40,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 160,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 160,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 616,
            "y": 160,
            "sourceX": 0,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 624,
            "y": 160,
            "sourceX": 8,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 632,
            "y": 160,
            "sourceX": 40,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 160,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 40,
            "y": 168,
            "sourceX": 64,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 168,
            "sourceX": 0,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 168,
            "sourceX": 8,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 616,
            "y": 168,
            "sourceX": 0,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 624,
            "y": 168,
            "sourceX": 8,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 632,
            "y": 168,
            "sourceX": 40,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 168,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 176,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 184,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 672,
            "y": 192,
            "sourceX": 0,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 680,
            "y": 192,
            "sourceX": 8,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 688,
            "y": 192,
            "sourceX": 40,
            "sourceY": 48,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 192,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 672,
            "y": 200,
            "sourceX": 0,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 680,
            "y": 200,
            "sourceX": 8,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 688,
            "y": 200,
            "sourceX": 40,
            "sourceY": 56,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 200,
            "sourceX": 16,
            "sourceY": 32,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 0,
            "y": 208,
            "sourceX": 48,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 8,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 16,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 24,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 32,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 40,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 48,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 56,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 64,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 72,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 80,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 88,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 96,
            "y": 208,
            "sourceX": 64,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 200,
            "y": 208,
            "sourceX": 48,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 208,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 216,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 224,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 232,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 240,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 248,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 256,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 264,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 272,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 280,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 288,
            "y": 208,
            "sourceX": 64,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 496,
            "y": 208,
            "sourceX": 48,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 504,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 512,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 520,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 528,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 536,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 544,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 552,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 560,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 568,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 576,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 584,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 592,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 616,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 624,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 632,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 640,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 648,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 656,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 664,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 672,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 680,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 688,
            "y": 208,
            "sourceX": 56,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 208,
            "sourceX": 64,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 0,
            "y": 216,
            "sourceX": 48,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 8,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 16,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 24,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 32,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 40,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 48,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 56,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 64,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 72,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 80,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 88,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 96,
            "y": 216,
            "sourceX": 64,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 104,
            "y": 216,
            "sourceX": 0,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 112,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 120,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 128,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 136,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 144,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 152,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 160,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 168,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 176,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 184,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 192,
            "y": 216,
            "sourceX": 16,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 200,
            "y": 216,
            "sourceX": 48,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 208,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 216,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 224,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 232,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 240,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 248,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 256,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 264,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 272,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 280,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 288,
            "y": 216,
            "sourceX": 64,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 296,
            "y": 216,
            "sourceX": 0,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 304,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 312,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 320,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 328,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 336,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 344,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 352,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 360,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 368,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 376,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 384,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 392,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 400,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 408,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 416,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 424,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 432,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 440,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 448,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 456,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 464,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 472,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 480,
            "y": 216,
            "sourceX": 8,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 488,
            "y": 216,
            "sourceX": 16,
            "sourceY": 0,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 496,
            "y": 216,
            "sourceX": 48,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 504,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 512,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 520,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 528,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 536,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 544,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 552,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 560,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 568,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 576,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 584,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 592,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 616,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 624,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 632,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 640,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 648,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 656,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 664,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 672,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 680,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 688,
            "y": 216,
            "sourceX": 56,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 216,
            "sourceX": 64,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 0,
            "y": 224,
            "sourceX": 48,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 8,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 16,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 24,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 32,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 40,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 48,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 56,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 64,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 72,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 80,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 88,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 96,
            "y": 224,
            "sourceX": 64,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 104,
            "y": 224,
            "sourceX": 0,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 112,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 120,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 128,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 136,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 144,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 152,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 160,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 168,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 176,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 184,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 192,
            "y": 224,
            "sourceX": 16,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 200,
            "y": 224,
            "sourceX": 48,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 208,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 216,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 224,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 232,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 240,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 248,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 256,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 264,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 272,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 280,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 288,
            "y": 224,
            "sourceX": 64,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 296,
            "y": 224,
            "sourceX": 0,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 304,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 312,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 320,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 328,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 336,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 344,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 352,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 360,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 368,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 376,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 384,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 392,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 400,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 408,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 416,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 424,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 432,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 440,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 448,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 456,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 464,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 472,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 480,
            "y": 224,
            "sourceX": 8,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 488,
            "y": 224,
            "sourceX": 16,
            "sourceY": 8,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 496,
            "y": 224,
            "sourceX": 48,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 504,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 512,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 520,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 528,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 536,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 544,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 552,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 560,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 568,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 576,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 584,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 592,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 600,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 608,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 616,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 624,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 632,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 640,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 648,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 656,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 664,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 672,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 680,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 688,
            "y": 224,
            "sourceX": 56,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        },
        {
            "x": 696,
            "y": 224,
            "sourceX": 64,
            "sourceY": 16,
            "size": 8,
            "tileset": "ldtkTileset2",
            "flipX": false,
            "flipY": false
        }
    ],
    "tilesets": {
        "ldtkTileset2": "/assets/tilesets/AllTiles.png"
    },
    "background": "/assets/backgrounds/SkyCreamVar.png"
} as const;
