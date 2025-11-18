"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var url_1 = require("url");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path.dirname(__filename);
var PIXI_RENDERER_PATH = path.join(__dirname, '../src/renderer/pixiRenderer.ts');
var OUTPUT_FILE_PATH = path.join(__dirname, '../src/renderer/pixel-font-geometry.ts');
// Helper to check if a pixel is "on" (value 1)
function isPixelOn(x, y, charMatrix) {
    if (y < 0 || y >= charMatrix.length || x < 0 || x >= charMatrix[y].length) {
        return false; // Out of bounds is considered "off"
    }
    return charMatrix[y][x] === 1;
}
// Helper to get external edges for a given "on" pixel
function getEdgesForPixel(px, py, charMatrix) {
    var edges = [];
    var height = charMatrix.length;
    var width = charMatrix[0].length; // Assuming all rows have the same width
    // Top edge
    if (!isPixelOn(px, py - 1, charMatrix)) {
        edges.push([px, py, px + 1, py]);
    }
    // Bottom edge
    if (!isPixelOn(px, py + 1, charMatrix)) {
        edges.push([px, py + 1, px + 1, py + 1]);
    }
    // Left edge
    if (!isPixelOn(px - 1, py, charMatrix)) {
        edges.push([px, py, px, py + 1]);
    }
    // Right edge
    if (!isPixelOn(px + 1, py, charMatrix)) {
        edges.push([px + 1, py, px + 1, py + 1]);
    }
    return edges;
}
// Helper to extract unique nodes from a list of edges
function getNodesFromEdges(edges) {
    var nodeSet = new Set();
    for (var _i = 0, edges_1 = edges; _i < edges_1.length; _i++) {
        var _a = edges_1[_i], x1 = _a[0], y1 = _a[1], x2 = _a[2], y2 = _a[3];
        nodeSet.add("".concat(x1, ",").concat(y1));
        nodeSet.add("".concat(x2, ",").concat(y2));
    }
    return Array.from(nodeSet).map(function (s) {
        var _a = s.split(',').map(Number), x = _a[0], y = _a[1];
        return [x, y];
    });
}
function generateFontGeometry() {
    return __awaiter(this, void 0, void 0, function () {
        var pixiRendererContent, pixelFontRegex, match, pixelFontString, PIXEL_FONT, PIXEL_FONT_GEOMETRY, char, charMatrix, allEdgesForChar, y, x, uniqueEdgesMap, _i, allEdgesForChar_1, edge, key, uniqueEdges, nodes, outputContent;
        return __generator(this, function (_a) {
            console.log('Reading pixiRenderer.ts...');
            pixiRendererContent = fs.readFileSync(PIXI_RENDERER_PATH, 'utf-8');
            pixelFontRegex = /const PIXEL_FONT: { \[key: string\]: number\[\]\[\] } = (\{[\s\S]*?\});/m;
            match = pixelFontRegex.exec(pixiRendererContent);
            if (!match || !match[1]) {
                console.error('Could not find PIXEL_FONT in pixiRenderer.ts');
                process.exit(1);
            }
            pixelFontString = match[1];
            try {
                // Use a function to create a scope and evaluate the string
                PIXEL_FONT = new Function("return ".concat(pixelFontString))();
            }
            catch (e) {
                console.error('Error parsing PIXEL_FONT object:', e);
                process.exit(1);
            }
            PIXEL_FONT_GEOMETRY = {};
            for (char in PIXEL_FONT) {
                charMatrix = PIXEL_FONT[char];
                allEdgesForChar = [];
                for (y = 0; y < charMatrix.length; y++) {
                    for (x = 0; x < charMatrix[y].length; x++) {
                        if (isPixelOn(x, y, charMatrix)) {
                            allEdgesForChar.push.apply(allEdgesForChar, getEdgesForPixel(x, y, charMatrix));
                        }
                    }
                }
                uniqueEdgesMap = new Map();
                for (_i = 0, allEdgesForChar_1 = allEdgesForChar; _i < allEdgesForChar_1.length; _i++) {
                    edge = allEdgesForChar_1[_i];
                    key = [edge[0], edge[1], edge[2], edge[3]].sort().join(',');
                    uniqueEdgesMap.set(key, edge);
                }
                uniqueEdges = Array.from(uniqueEdgesMap.values());
                nodes = getNodesFromEdges(uniqueEdges);
                PIXEL_FONT_GEOMETRY[char] = {
                    nodes: nodes,
                    edges: uniqueEdges,
                };
            }
            outputContent = "// src/renderer/pixel-font-geometry.ts\n// This file is auto-generated by scripts/generate-font-geometry.ts\n// Do not modify directly.\n\nexport interface PixelFontCharGeometry {\n    nodes: [number, number][];\n    edges: [number, number, number, number][];\n}\n\nexport const PIXEL_FONT_GEOMETRY: { [key: string]: PixelFontCharGeometry } = ".concat(JSON.stringify(PIXEL_FONT_GEOMETRY, null, 2), ";\n");
            fs.writeFileSync(OUTPUT_FILE_PATH, outputContent, 'utf-8');
            console.log("Generated font geometry to ".concat(OUTPUT_FILE_PATH));
            return [2 /*return*/];
        });
    });
}
generateFontGeometry().catch(console.error);
