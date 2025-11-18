# Pixel Font Geometry Generation Plan

## Objective
To pre-calculate and bake the geometric data (nodes and edges) for our `PIXEL_FONT` set into the codebase. This will enable more flexible, efficient, and visually diverse rendering of the multiplier display, allowing for node-based, edge-based, or more complex visual feedback without on-the-fly calculations.

## Definitions

### Nodes
In the context of our pixel grid, "nodes" refer to the corners of each "on" pixel (`1`) that forms a character.
*   **Representation:** A list of `[x, y]` coordinates, representing the vertices of the character's shape.
*   **Example:** For a single pixel at `(0,0)`, its nodes would be `[[0,0], [1,0], [1,1], [0,1]]`.

### Edges
"Edges" refer to the line segments that form the *outer boundary* of a character's shape. We are specifically interested in external edges to avoid drawing lines within the character's solid form.
*   **Representation:** A list of `[x1, y1, x2, y2]` coordinates, representing the start and end points of each line segment.
*   **Example:** For a single pixel at `(0,0)`, its edges would be `[[0,0, 1,0], [1,0, 1,1], [1,1, 0,1], [0,1, 0,0]]` (Top, Right, Bottom, Left).

## Script Workflow (`scripts/generate-font-geometry.ts`)

The generation process will be handled by a Node.js script with the following steps:

1.  **Read Source File:** The script will read the content of `src/renderer/pixiRenderer.ts`.
2.  **Extract `PIXEL_FONT` Object:** It will parse the file content to locate and extract the `PIXEL_FONT` constant and its associated pixel grid data.
3.  **Process Each Character:** For each character definition within `PIXEL_FONT`:
    *   It will iterate through the character's 2D pixel grid.
    *   For every "on" pixel (`1`), it will examine its four cardinal neighbors (top, bottom, left, right).
    *   If a neighbor is "off" (`0`) or if the pixel is at the boundary of the character's defined grid, the corresponding edge segment will be identified and added to a temporary list. This ensures only external edges are captured.
    *   From the collected edge segments, a unique set of nodes (vertices) will be derived.
4.  **Structure Output Data:** The processed data for each character (its unique nodes and external edges) will be compiled into a structured TypeScript object.
    ```typescript
    // Example structure for a single character
    export const PIXEL_FONT_GEOMETRY = {
      '0': {
        nodes: [[x1, y1], [x2, y2], /* ... */],
        edges: [[x1, y1, x2, y2], /* ... */]
      },
      // ... other characters
    };
    ```
5.  **Write New File:** The script will write this structured TypeScript object into a new file, `src/renderer/pixel-font-geometry.ts`.

## Usage of Generated Data

Once `src/renderer/pixel-font-geometry.ts` is generated, `src/renderer/pixiRenderer.ts` (or a new rendering component) can import `PIXEL_FONT_GEOMETRY` and use its data to:

*   Render the multiplier using only the `nodes` for a "dotted" or "point cloud" effect.
*   Render the multiplier using only the `edges` for a "wireframe" or "vector outline" style.
*   Implement more sophisticated animations by manipulating the pre-defined nodes and edges (e.g., drawing edges sequentially, animating node positions).
*   Reduce runtime computation by having the geometric data readily available.
