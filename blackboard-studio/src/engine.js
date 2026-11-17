/* Blackboard Studio 9 — processing engine. Adapted from the supplied v8.5. */
(function(root){
"use strict";
const PRESETS = {
    softink:   { name:'Soft Ink', desc:'Smooth contours + deep shadows', lab:[
        {label:'Blur Sigma',min:2,max:40,step:1,def:12},{label:'Edge Threshold',min:5,max:80,step:1,def:12},{label:'Shadow Cutoff',min:0,max:160,step:1,def:48}]},
    animeink:  { name:'Anime Ink+', desc:'Clean edges + shadow fill', lab:[
        {label:'Blur Sigma',min:2,max:80,step:1,def:14},{label:'Edge Threshold',min:5,max:120,step:1,def:30},{label:'Shadow Depth',min:0,max:80,step:1,def:25}]},
    manga:     { name:'Manga', desc:'Sleek ink lines', lab:[
        {label:'Blur Sigma',min:2,max:80,step:1,def:10},{label:'Edge Threshold',min:5,max:120,step:1,def:22},{label:'Post Threshold',min:10,max:200,step:1,def:128}]},
    lineart:   { name:'Line Art', desc:'DoG edge detection', lab:[
        {label:'Sigma Small',min:2,max:40,step:1,def:8},{label:'Sigma Large',min:10,max:100,step:1,def:30},{label:'Threshold',min:0,max:100,step:1,def:18}]},
    bold:      { name:'Bold', desc:'Thick graphic strokes', lab:[
        {label:'Blur Sigma',min:5,max:100,step:1,def:25},{label:'Threshold',min:10,max:150,step:1,def:55},{label:'Line Widen',min:0,max:5,step:1,def:2}]},
    solid:     { name:'Solid', desc:'Flat cel shading', lab:[
        {label:'Quantize Levels',min:2,max:8,step:1,def:3},{label:'Edge Threshold',min:0,max:80,step:1,def:20},{label:'Smoothing',min:0,max:10,step:1,def:2}]},
    canny:     { name:'Canny+', desc:'Linked edge outlines', lab:[
        {label:'Low Threshold',min:5,max:100,step:1,def:20},{label:'High Threshold',min:20,max:200,step:1,def:60},{label:'Blur Sigma',min:2,max:40,step:1,def:8}]},
    xdog:      { name:'XDoG', desc:'Extended DoG for anime', lab:[
        {label:'Sigma 1',min:2,max:40,step:1,def:6},{label:'Sigma 2',min:10,max:120,step:1,def:40},{label:'Phi',min:80,max:300,step:1,def:150}]},
    sauvola:   { name:'Sauvola', desc:'Local adaptive threshold', lab:[
        {label:'Window Radius',min:3,max:30,step:1,def:10},{label:'Weight k',min:1,max:50,step:1,def:12},{label:'Offset R',min:10,max:200,step:1,def:128}]},
    wolf:      { name:'Wolf', desc:'Uneven lighting fix', lab:[
        {label:'Window',min:5,max:40,step:1,def:15},{label:'k Factor',min:1,max:50,step:1,def:18},{label:'Offset',min:0,max:100,step:1,def:0}]},
    hybrid:    { name:'Hybrid', desc:'Edges + tonal fill', lab:[
        {label:'Edge Weight',min:0,max:100,step:1,def:60},{label:'Tone Levels',min:2,max:10,step:1,def:4},{label:'Blend',min:0,max:100,step:1,def:50}]},
    darkart:   { name:'Dark Art', desc:'Shadow detail emphasis', lab:[
        {label:'Shadow Boost',min:0,max:100,step:1,def:40},{label:'Edge Threshold',min:5,max:80,step:1,def:20},{label:'Merge',min:0,max:100,step:1,def:60}]},
    floyd:     { name:'Dither FS', desc:'Floyd-Steinberg diffusion', lab:[
        {label:'Threshold',min:0,max:255,step:1,def:128},{label:'Spread',min:50,max:150,step:1,def:100},{label:'Pre-blur',min:0,max:20,step:1,def:0}]},
    atkinson:  { name:'Atkinson', desc:'High-contrast dither', lab:[
        {label:'Threshold',min:0,max:255,step:1,def:128},{label:'Passes',min:1,max:4,step:1,def:1},{label:'Pre-blur',min:0,max:20,step:1,def:0}]},
    jjn:       { name:'JJN', desc:'Jarvis-Judice-Ninke', lab:[
        {label:'Threshold',min:0,max:255,step:1,def:128},{label:'Spread',min:50,max:150,step:1,def:100},{label:'Pre-blur',min:0,max:20,step:1,def:0}]},
    stucki:    { name:'Stucki', desc:'Smooth serpentine', lab:[
        {label:'Threshold',min:0,max:255,step:1,def:128},{label:'Spread',min:50,max:150,step:1,def:100},{label:'Pre-blur',min:0,max:20,step:1,def:0}]},
    sierra:    { name:'Sierra', desc:'Crisp serpentine', lab:[
        {label:'Threshold',min:0,max:255,step:1,def:128},{label:'Spread',min:50,max:150,step:1,def:100},{label:'Pre-blur',min:0,max:20,step:1,def:0}]},
    ordered:   { name:'Bayer', desc:'Ordered 4×4 dither', lab:[
        {label:'Threshold',min:0,max:255,step:1,def:128},{label:'Strength',min:10,max:100,step:1,def:100},{label:'Pre-blur',min:0,max:20,step:1,def:0}]},
    bayer8:    { name:'Bayer 8×8', desc:'Smooth ordered dither', lab:[
        {label:'Threshold',min:0,max:255,step:1,def:128},{label:'Strength',min:10,max:100,step:1,def:100},{label:'Pre-blur',min:0,max:20,step:1,def:0}]},
    ign:       { name:'IGN', desc:'Interleaved gradient noise', lab:[
        {label:'Threshold',min:0,max:255,step:1,def:128},{label:'Noise Scale',min:10,max:200,step:1,def:100},{label:'Strength',min:10,max:100,step:1,def:100}]},
    bluenoise: { name:'Grain', desc:'Deterministic hashed grain', lab:[
        {label:'Threshold',min:0,max:255,step:1,def:128},{label:'Grain Size',min:10,max:100,step:1,def:40},{label:'Strength',min:10,max:100,step:1,def:100}]},
    bradley:   { name:'Bradley', desc:'Adaptive threshold', lab:[
        {label:'Window',min:3,max:40,step:1,def:12},{label:'Bias',min:-30,max:30,step:1,def:-5},{label:'Post Blur',min:0,max:10,step:1,def:0}]},
    adaptive:  { name:'Adaptive', desc:'Region-aware threshold', lab:[
        {label:'Block Size',min:4,max:40,step:1,def:16},{label:'Bias',min:-30,max:30,step:1,def:0},{label:'Smooth',min:0,max:10,step:1,def:1}]},
    crosshatch:{ name:'Crosshatch', desc:'Diagonal line shading', lab:[
        {label:'Line Spacing',min:3,max:30,step:1,def:8},{label:'Angle Layers',min:1,max:4,step:1,def:3},{label:'Threshold',min:10,max:200,step:1,def:120}]},
    pencil:    { name:'Pencil', desc:'Multi-angle hatching', lab:[
        {label:'Line Spacing',min:3,max:30,step:1,def:6},{label:'Density',min:1,max:20,step:1,def:8},{label:'Cutoff',min:50,max:255,step:1,def:180}]},
    halftone:  { name:'Halftone', desc:'Screentone dot matrix', lab:[
        {label:'Dot Spacing',min:4,max:30,step:1,def:8},{label:'Angle',min:0,max:90,step:1,def:45},{label:'Threshold',min:10,max:200,step:1,def:128}]},
    stipple:   { name:'Stipple', desc:'Organic dot texture', lab:[
        {label:'Dot Size',min:1,max:8,step:1,def:2},{label:'Density',min:10,max:100,step:1,def:50},{label:'Threshold',min:10,max:200,step:1,def:128}]},
    woodcut:   { name:'Woodcut', desc:'Flow-line engraving', lab:[
        {label:'Line Spacing',min:2,max:20,step:1,def:5},{label:'Direction',min:0,max:180,step:1,def:90},{label:'Threshold',min:10,max:200,step:1,def:128}]},
    threshold: { name:'Threshold', desc:'Plain binarize', lab:[
        {label:'Threshold',min:0,max:255,step:1,def:128},{label:'Unused',min:0,max:100,step:1,def:50},{label:'Unused',min:0,max:100,step:1,def:50}]}
};

function gaussBlur(src, w, h, radius) {
    if (radius <= 0) return new Float32Array(src);
    const r = Math.ceil(radius * 2.5);
    const kernel = new Float32Array(r * 2 + 1);
    let sum = 0;
    for (let i = -r; i <= r; i++) {
        const v = Math.exp(-(i * i) / (2 * radius * radius));
        kernel[i + r] = v;
        sum += v;
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);

    // Horizontal pass
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let val = 0;
            for (let k = -r; k <= r; k++) {
                const sx = Math.min(w - 1, Math.max(0, x + k));
                val += src[y * w + sx] * kernel[k + r];
            }
            tmp[y * w + x] = val;
        }
    }
    // Vertical pass
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let val = 0;
            for (let k = -r; k <= r; k++) {
                const sy = Math.min(h - 1, Math.max(0, y + k));
                val += tmp[sy * w + x] * kernel[k + r];
            }
            out[y * w + x] = val;
        }
    }
    return out;
}

// Difference of Gaussians for edge detection
function dogEdges(gray, w, h, sigma1, sigma2) {
    const g1 = gaussBlur(gray, w, h, sigma1);
    const g2 = gaussBlur(gray, w, h, sigma2);
    const out = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
        const diff = g1[i] - g2[i];
        out[i] = Math.min(255, Math.max(0, Math.abs(diff) * 2.5));
    }
    return out;
}

// Simple median filter for denoising
function medianFilter(gray, w, h, radius) {
    const out = new Float32Array(w * h);
    const size = (2 * radius + 1) * (2 * radius + 1);
    const buf = new Uint8ClampedArray(size);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let idx = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const sx = Math.min(w-1, Math.max(0, x+dx));
                    const sy = Math.min(h-1, Math.max(0, y+dy));
                    buf[idx++] = gray[sy * w + sx];
                }
            }
            buf.sort();
            out[y * w + x] = buf[Math.floor(size / 2)];
        }
    }
    return out;
}

// Unsharp mask for sharpening
function unsharpMask(gray, w, h, amount) {
    if (amount <= 0) return new Float32Array(gray);
    const blurred = gaussBlur(gray, w, h, 1.2);
    const out = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
        // A soft noise floor keeps small texture fluctuations from becoming ink.
        const difference = gray[i] - blurred[i];
        const detail = Math.sign(difference) * Math.max(0, Math.abs(difference) - 8);
        out[i] = Math.min(255, Math.max(0, gray[i] + detail * amount * 0.5));
    }
    return out;
}

// Local contrast enhancement (CLAHE-inspired)
function localContrast(gray, w, h, strength) {
    if (strength <= 0) return new Uint8ClampedArray(gray);
    const blurred = gaussBlur(gray, w, h, Math.max(3, Math.floor(w / 20)));
    const out = new Float32Array(w * h);
    const s = strength / 100;
    for (let i = 0; i < w * h; i++) {
        const diff = gray[i] - blurred[i];
        out[i] = Math.min(255, Math.max(0, gray[i] + diff * s * 1.5));
    }
    return out;
}

// Simple connected component removal by size
function removeSmallComponents(mask, w, h, minSize) {
    if (minSize <= 0) return mask;
    const visited = new Uint8Array(w * h);
    const out = new Uint8Array(w * h);
    const stack = [];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (visited[idx] || !mask[idx]) continue;
            // Flood fill
            stack.length = 0;
            stack.push(idx);
            visited[idx] = 1;
            let count = 0;
            const region = [];
            while (stack.length) {
                const ci = stack.pop();
                region.push(ci);
                count++;
                const cx = ci % w, cy = (ci - cx) / w;
                for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nx = cx+dx, ny = cy+dy;
                    if (nx>=0 && nx<w && ny>=0 && ny<h) {
                        const ni = ny*w+nx;
                        if (!visited[ni] && mask[ni]) { visited[ni]=1; stack.push(ni); }
                    }
                }
            }
            if (count >= minSize) region.forEach(i => out[i] = 1);
        }
    }
    return out;
}

// Gap repair: dilate then intersect with original
// Morphological closing bridges narrow breaks, then restores stroke thickness.
function repairGaps(mask, w, h, radius) {
    if (!radius) return mask;
    let src = mask;
    for (const dilation of [true, false]) {
        const out = new Uint8Array(w*h);
        for (let y=0;y<h;y++) for(let x=0;x<w;x++) {
            let value = dilation ? 0 : 1;
            search: for(let dy=-radius;dy<=radius;dy++) for(let dx=-radius;dx<=radius;dx++) {
                const nx=Math.max(0,Math.min(w-1,x+dx)), ny=Math.max(0,Math.min(h-1,y+dy));
                if (dilation ? src[ny*w+nx] : !src[ny*w+nx]) { value=dilation?1:0; break search; }
            }
            out[y*w+x]=value;
        }
        src=out;
    }
    return src;
}

// Fill small white holes inside black regions
function fillHoles(mask, w, h, maxSize) {
    if (maxSize <= 0) return mask;
    const visited = new Uint8Array(w * h);
    const out = new Uint8Array(mask);
    const stack = [];

    // Flood fill white regions from border (these are background)
    for (let x = 0; x < w; x++) {
        if (!mask[x] && !visited[x]) { stack.push(x); visited[x]=1; }
        const bi = (h-1)*w+x;
        if (!mask[bi] && !visited[bi]) { stack.push(bi); visited[bi]=1; }
    }
    for (let y = 0; y < h; y++) {
        if (!mask[y*w] && !visited[y*w]) { stack.push(y*w); visited[y*w]=1; }
        const ri = y*w+w-1;
        if (!mask[ri] && !visited[ri]) { stack.push(ri); visited[ri]=1; }
    }
    while (stack.length) {
        const ci = stack.pop();
        const cx = ci%w, cy = (ci-cx)/w;
        for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const nx=cx+dx, ny=cy+dy;
            if (nx>=0&&nx<w&&ny>=0&&ny<h) {
                const ni = ny*w+nx;
                if (!visited[ni] && !mask[ni]) { visited[ni]=1; stack.push(ni); }
            }
        }
    }
    // Any unvisited white pixel is an interior hole — fill if small
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y*w+x;
            if (!mask[idx] && !visited[idx]) {
                // Count hole size
                stack.length = 0;
                stack.push(idx);
                visited[idx] = 1;
                let count = 0;
                const hole = [];
                while (stack.length) {
                    const ci = stack.pop();
                    hole.push(ci);
                    count++;
                    const cx=ci%w, cy=(ci-cx)/w;
                    for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                        const nx=cx+dx, ny=cy+dy;
                        if (nx>=0&&nx<w&&ny>=0&&ny<h) {
                            const ni=ny*w+nx;
                            if (!visited[ni] && !mask[ni]) { visited[ni]=1; stack.push(ni); }
                        }
                    }
                }
                if (count <= maxSize) hole.forEach(i => out[i] = 1);
            }
        }
    }
    return out;
}

// Bayer ordered dither matrices
const BAYER4 = [
    [0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]
];
const fract = v => v - Math.floor(v);
const BAYER8 = Array.from({length:64}, (_,i) => {
    const x=i%8, y=Math.floor(i/8);
    return 4*BAYER4[y%4][x%4]+[[0,2],[3,1]][Math.floor(y/4)][Math.floor(x/4)];
});

/* ══════════════════════════════════════
   PRESET RENDER FUNCTIONS — QUALITY UPGRADED
   ══════════════════════════════════════ */

function getLab(S) {
    const v = S.labVals[S.preset] || PRESETS[S.preset].lab.map(l => l.def);
    return v;
}

function renderPreset(gray, w, h, thresh, extra, lw, S) {
    const lab = getLab(S);
    const preset = S.preset;
    const out = new Uint8Array(w * h);

    // Helper: apply threshold with hysteresis for cleaner edges
    function applyThreshold(edgeMap, t) {
        for (let i = 0; i < w*h; i++) out[i] = edgeMap[i] > t ? 1 : 0;
    }

    // Helper: dilate mask by n pixels (for line weight)
    function dilate(mask, n) {
        if (n <= 0) return mask;
        let src = mask;
        for (let pass = 0; pass < n; pass++) {
            const d = new Uint8Array(w*h);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                if (src[y*w+x]) { d[y*w+x]=1; continue; }
                for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nx=x+dx,ny=y+dy;
                    if (nx>=0&&nx<w&&ny>=0&&ny<h&&src[ny*w+nx]) { d[y*w+x]=1; break; }
                }
            }
            src = d;
        }
        return src;
    }

    // Helper: erode mask
    function erode(mask, n) {
        if (n <= 0) return mask;
        let src = mask;
        for (let pass = 0; pass < n; pass++) {
            const e = new Uint8Array(w*h);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                if (!src[y*w+x]) continue;
                let ok = true;
                for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nx=x+dx,ny=y+dy;
                    if (nx<0||nx>=w||ny<0||ny>=h||!src[ny*w+nx]) { ok=false; break; }
                }
                if (ok) e[y*w+x] = 1;
            }
            src = e;
        }
        return src;
    }

    switch(preset) {
        case 'softink': {
            const sigma=lab[0]/10,small=gaussBlur(gray,w,h,sigma*.5),large=gaussBlur(gray,w,h,sigma);
            for(let i=0;i<w*h;i++)out[i]=((large[i]-small[i])*2.5*(1+extra*.15)>lab[1]||gray[i]<lab[2])?1:0;
            break;
        }
        case 'animeink': {
            const sigma = lab[0]/10;
            const edgeT = lab[1];
            const shadowBoost = lab[2];
            const edges = dogEdges(gray, w, h, sigma * 0.5, sigma);
            // Add shadow regions
            // Greater depth adds shadows; zero means outlines only.
            const shadowThresh = shadowBoost * 2.5;
            for (let i = 0; i < w*h; i++) {
                const edgeVal = Math.min(255, edges[i] * (1 + extra * 0.15));
                const shadowVal = gray[i] < shadowThresh ? (shadowThresh - gray[i]) * 1.5 : 0;
                out[i] = (edgeVal + shadowVal) > edgeT ? 1 : 0;
            }
            break;
        }
        case 'manga': {
            const sigma = lab[0]/10;
            const edgeT = lab[1];
            const postT = lab[2];
            let edges = dogEdges(gray, w, h, sigma * 0.4, sigma);
            // Boost edges based on extra sensitivity
            edges = gaussBlur(edges, w, h, 0.5); // slight smooth for cleaner lines
            for (let i = 0; i < w*h; i++) {
                const v = Math.min(255, edges[i] * (1 + extra * 0.2));
                out[i] = v > edgeT ? 1 : 0;
            }
            // Post-threshold cleanup: remove faint residuals
            if (postT < 250) {
                const cleaned = gaussBlur(gray, w, h, sigma * 0.3);
                for (let i = 0; i < w*h; i++) {
                    if (out[i] && cleaned[i] > postT) out[i] = 0;
                }
            }
            break;
        }
        case 'lineart': {
            const s1 = lab[0]/10, s2 = lab[1]/10, t = lab[2];
            const edges = dogEdges(gray, w, h, s1, s2);
            for (let i = 0; i < w*h; i++) {
                out[i] = edges[i] * (1 + extra*0.15) > t ? 1 : 0;
            }
            break;
        }
        case 'bold': {
            const sigma = lab[0]/10, t = lab[1], widen = lab[2];
            const edges = dogEdges(gray, w, h, sigma*0.3, sigma);
            for (let i = 0; i < w*h; i++) out[i] = edges[i] > t ? 1 : 0;
            const dilated = dilate(out, widen);
            for (let i = 0; i < w*h; i++) out[i] = dilated[i];
            break;
        }
        case 'solid': {
            const levels = lab[0], edgeT = lab[1], smooth = lab[2]/10;
            // Quantize then edge-detect the quantized result
            const step = 256 / levels;
            const quantized = new Uint8ClampedArray(w*h);
            for (let i = 0; i < w*h; i++) quantized[i] = Math.floor(gray[i]/step)*step + step/2;
            if (smooth > 0.5) { const s = gaussBlur(quantized, w, h, smooth); for(let i=0;i<w*h;i++) quantized[i]=s[i]; }
            const edges = dogEdges(quantized, w, h, 0.8, 1.5);
            for (let i = 0; i < w*h; i++) {
                const isEdge = edges[i] > edgeT;
                const isDark = gray[i] < thresh;
                out[i] = (isEdge || isDark) ? 1 : 0;
            }
            break;
        }
        case 'canny': {
            const lo = lab[0], hi = lab[1], sigma = lab[2]/10;
            const blurred = gaussBlur(gray, w, h, sigma);
            // Sobel gradients
            const gx = new Float32Array(w*h), gy = new Float32Array(w*h);
            const mag = new Float32Array(w*h);
            for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) {
                const idx = y*w+x;
                gx[idx] = -blurred[(y-1)*w+x-1] + blurred[(y-1)*w+x+1]
                           -2*blurred[y*w+x-1] + 2*blurred[y*w+x+1]
                           -blurred[(y+1)*w+x-1] + blurred[(y+1)*w+x+1];
                gy[idx] = -blurred[(y-1)*w+x-1] - 2*blurred[(y-1)*w+x] - blurred[(y-1)*w+x+1]
                           +blurred[(y+1)*w+x-1] + 2*blurred[(y+1)*w+x] + blurred[(y+1)*w+x+1];
                mag[idx] = Math.sqrt(gx[idx]*gx[idx] + gy[idx]*gy[idx]);
            }
            // Non-maximum suppression
            const nms = new Float32Array(w*h);
            for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) {
                const idx = y*w+x;
                const angle = Math.atan2(gy[idx], gx[idx]) * 180 / Math.PI;
                const a = ((angle % 180) + 180) % 180;
                let n1=0, n2=0;
                if (a < 22.5 || a >= 157.5) { n1=mag[y*w+x-1]; n2=mag[y*w+x+1]; }
                else if (a < 67.5) { n1=mag[(y-1)*w+x+1]; n2=mag[(y+1)*w+x-1]; }
                else if (a < 112.5) { n1=mag[(y-1)*w+x]; n2=mag[(y+1)*w+x]; }
                else { n1=mag[(y-1)*w+x-1]; n2=mag[(y+1)*w+x+1]; }
                nms[idx] = (mag[idx] >= n1 && mag[idx] >= n2) ? mag[idx] : 0;
            }
            // Double threshold + hysteresis
            for (let i = 0; i < w*h; i++) out[i] = nms[i] > hi ? 1 : 0;
            // Connect weak edges
            let changed = true;
            while (changed) {
                changed = false;
                for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) {
                    const idx = y*w+x;
                    if (out[idx] || nms[idx] < lo) continue;
                    for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]) {
                        if (out[(y+dy)*w+x+dx]) { out[idx]=1; changed=true; break; }
                    }
                }
            }
            break;
        }
        case 'xdog': {
            const s1 = lab[0]/10, s2 = lab[1]/10, phi = lab[2]/100;
            const g1 = gaussBlur(gray, w, h, s1);
            const g2 = gaussBlur(gray, w, h, s2);
            for (let i = 0; i < w*h; i++) {
                // Unit-gain high-pass response: a uniform image must stay blank.
                // Phi controls edge steepness rather than subtracting image brightness.
                const response=(g1[i]-g2[i])/255;
                const v=response>=0?1:1+Math.tanh(10*phi*response);
                out[i] = v < (0.95 - extra*0.03) ? 1 : 0;
            }
            break;
        }
        case 'sauvola': case 'wolf': {
            const {mean, std} = localStats(gray,w,h,lab[0]);
            let maxStd=1, minGray=255;
            for(let i=0;i<gray.length;i++){maxStd=Math.max(maxStd,std[i]);minGray=Math.min(minGray,gray[i]);}
            for(let i=0;i<gray.length;i++) {
                const t=preset==='sauvola'
                    ? mean[i]*(1+lab[1]/100*(std[i]/lab[2]-1))
                    : mean[i]+lab[1]/100*(std[i]/maxStd-1)*(mean[i]-minGray)+lab[2];
                out[i]=gray[i]<t?1:0;
            }
            break;
        }
        case 'hybrid': {
            const edgeW = lab[0]/100, levels = lab[1], blend = lab[2]/100;
            // Get edges
            const edges = dogEdges(gray, w, h, 1, 3);
            const edgeMask = new Uint8Array(w*h);
            for (let i=0;i<w*h;i++) edgeMask[i] = edges[i]*edgeW > 20 ? 1 : 0;
            // Get tonal
            const step = 256/levels;
            const toneMask = new Uint8Array(w*h);
            for (let i=0;i<w*h;i++) toneMask[i] = (Math.floor(gray[i]/step)+0.5)*step < thresh ? 1 : 0;
            // Blend
            for (let i=0;i<w*h;i++) {
                if (edgeMask[i]) out[i]=1;
                else if (toneMask[i] && (BAYER4[Math.floor(i/w)%4][i%w%4]+0.5)/16 < blend) out[i]=1;
            }
            break;
        }
        case 'darkart': {
            const boost = lab[0]/100, edgeT = lab[1], merge = lab[2]/100;
            // Boost shadows
            const boosted = new Uint8ClampedArray(w*h);
            for (let i=0;i<w*h;i++) {
                if (gray[i] < 128) boosted[i] = Math.max(0, gray[i] - boost * (128-gray[i]));
                else boosted[i] = gray[i];
            }
            const edges = dogEdges(boosted, w, h, 0.8, 2.5);
            for (let i=0;i<w*h;i++) {
                const edgeVal = edges[i] * (1+extra*0.1);
                const shadowVal = (128 - boosted[i]) * merge * 0.8;
                out[i] = (edgeVal + shadowVal) > edgeT ? 1 : 0;
            }
            break;
        }
        case 'floyd': case 'jjn': case 'stucki': case 'sierra': {
            const t = lab[0], spread = lab[1]/100, preBlur = lab[0+2] !== undefined ? lab[2] : 0;
            let src = gray;
            if (preBlur > 0.5) src = gaussBlur(gray, w, h, preBlur/10);
            const err = new Float32Array(src);
            // Diffusion kernels
            let kernel;
            if (preset==='floyd') kernel=[[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]];
            else if (preset==='jjn') kernel=[[1,0,7/48],[2,0,5/48],[-2,1,3/48],[-1,1,5/48],[0,1,7/48],[1,1,5/48],[2,1,3/48],[-2,2,1/48],[-1,2,3/48],[0,2,5/48],[1,2,3/48],[2,2,1/48]];
            else if (preset==='stucki') kernel=[[1,0,8/42],[2,0,4/42],[-2,1,2/42],[-1,1,4/42],[0,1,8/42],[1,1,4/42],[2,1,2/42],[-2,2,1/42],[-1,2,2/42],[0,2,4/42],[1,2,2/42],[2,2,1/42]];
            else kernel=[[1,0,2/4],[-1,1,1/4],[0,1,1/4]]; // Sierra Lite, total weight 1
            const serpentine = ['stucki','sierra','floyd'].includes(preset);
            for (let y = 0; y < h; y++) {
                const leftToRight = serpentine ? (y%2===0) : true;
                const xStart = leftToRight ? 0 : w-1;
                const xEnd = leftToRight ? w : -1;
                const xStep = leftToRight ? 1 : -1;
                for (let x = xStart; x !== xEnd; x += xStep) {
                    const idx = y*w+x;
                    const old = err[idx];
                    const nv = old < t ? 0 : 255;
                    out[idx] = nv < 128 ? 1 : 0;
                    const diff = (old - nv) * spread;
                    for (const [dx,dy,wgt] of kernel) {
                        const nx=x+dx*xStep, ny=y+dy;
                        if (nx>=0&&nx<w&&ny>=0&&ny<h) err[ny*w+nx] += diff * wgt;
                    }
                }
            }
            break;
        }
        case 'atkinson': {
            const t = lab[0], passes = lab[1], preBlur = lab[2];
            let src = gray;
            if (preBlur > 0.5) src = gaussBlur(gray, w, h, preBlur/10);
            const err = new Float32Array(src);
            const kernel = [[1,0,1/8],[2,0,1/8],[-1,1,1/8],[0,1,1/8],[1,1,1/8],[0,2,1/8]];
            for (let p = 0; p < passes; p++) {
                for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                    const idx = y*w+x;
                    const old = err[idx];
                    const nv = old < t ? 0 : 255;
                    if (p === passes-1) out[idx] = nv < 128 ? 1 : 0;
                    err[idx] = nv;
                    const diff = old - nv; // Atkinson only diffuses 6/8
                    for (const [dx,dy,wgt] of kernel) {
                        const nx=x+dx, ny=y+dy;
                        if (nx>=0&&nx<w&&ny>=0&&ny<h) err[ny*w+nx] += diff * wgt;
                    }
                }
            }
            break;
        }
        case 'ordered': {
            const t = lab[0], strength = lab[1]/100, preBlur = lab[2];
            let src = gray;
            if (preBlur > 0.5) src = gaussBlur(gray, w, h, preBlur/10);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const bayerVal = ((BAYER4[y%4][x%4]+0.5) / 16 - 0.5) * 255 * strength;
                out[y*w+x] = (src[y*w+x] + bayerVal) < t ? 1 : 0;
            }
            break;
        }
        case 'bayer8': {
            const t = lab[0], strength = lab[1]/100, preBlur = lab[2];
            let src = gray;
            if (preBlur > 0.5) src = gaussBlur(gray, w, h, preBlur/10);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const bayerVal = ((BAYER8[(y%8)*8+(x%8)]+0.5) / 64 - 0.5) * 255 * strength;
                out[y*w+x] = (src[y*w+x] + bayerVal) < t ? 1 : 0;
            }
            break;
        }
        case 'ign': {
            // Noise Scale and Strength both set the noise amplitude; 100% of each spans the full tone range.
            const t = lab[0], amplitude = 255 * (lab[1]/100) * (lab[2]/100);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                // Interleaved gradient noise (Jimenez 2014), centred on zero so it never shifts brightness.
                const n = fract(52.9829189 * fract(0.06711056*x + 0.00583715*y)) - 0.5;
                out[y*w+x] = (gray[y*w+x] + n * amplitude) < t ? 1 : 0;
            }
            break;
        }
        case 'bluenoise': {
            const t = lab[0], grain = lab[1]/10, amplitude = 255 * lab[2]/100;
            // Hashed value noise on a grain-sized grid, centred on zero so Strength never shifts brightness.
            const seed = 42;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const bx = Math.floor(x/grain), by = Math.floor(y/grain);
                const hash = Math.sin(bx*127.1+by*311.7+seed)*43758.5453 % 1;
                const n = Math.abs(hash) - 0.5;
                out[y*w+x] = (gray[y*w+x] + n * amplitude) < t ? 1 : 0;
            }
            break;
        }
        case 'bradley': {
            const win = lab[0], bias = lab[1]/10, postBlur = lab[2];
            const src = postBlur > 0 ? gaussBlur(gray,w,h,postBlur/10) : gray;
            const blurred = localStats(src,w,h,win).mean;
            for (let i = 0; i < w*h; i++) {
                out[i] = src[i] < blurred[i] - bias ? 1 : 0;
            }
            break;
        }
        case 'adaptive': {
            const block = lab[0], bias = lab[1]/10, smooth = lab[2]/10;
            const src = smooth > 0 ? gaussBlur(gray,w,h,smooth) : gray;
            const blurred = localStats(src,w,h,block).mean;
            for (let i = 0; i < w*h; i++) {
                out[i] = src[i] < blurred[i] * (1 + bias/100) ? 1 : 0;
            }
            break;
        }
        case 'crosshatch': {
            const spacing = Math.max(2, lab[0]);
            const layers = Math.min(4, Math.max(1, lab[1]));
            const cutoff = lab[2];
            const angles = [Math.PI/4, -Math.PI/4, Math.PI/6, -Math.PI/6];
            const cosA = angles.map(a => Math.cos(a));
            const sinA = angles.map(a => Math.sin(a));
            const lineW = Math.min(1.4, Math.max(0.6, spacing * 0.09));
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const bright = gray[y*w+x];
                if (bright >= cutoff) continue;
                const darkness = (cutoff - bright) / cutoff;
                const nLayers = Math.max(0, Math.floor(darkness * layers * 1.8));
                if (nLayers < 1) continue;
                let hit = false;
                for (let a = 0; a < Math.min(nLayers, layers); a++) {
                    const proj = x*cosA[a] + y*sinA[a];
                    const pos = ((proj % spacing) + spacing) % spacing;
                    if (pos < lineW) { hit=true; break; }
                }
                if (darkness > 0.92) hit = true;
                if (hit) out[y*w+x] = 1;
            }
            break;
        }
        case 'pencil': {
            const spacing = Math.max(2, lab[0]);
            const density = lab[1];
            const cutoff = lab[2];
            const maxLayers = Math.min(4, Math.max(1, Math.ceil(density/5)));
            const densityScale = 0.8 + (density/20)*1.2;
            const angles = [Math.PI/6, -Math.PI/6, Math.PI/3, -Math.PI/3];
            const cosA = angles.map(a => Math.cos(a));
            const sinA = angles.map(a => Math.sin(a));
            const lineW = Math.min(1.5, Math.max(0.6, spacing*0.085));
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const bright = gray[y*w+x];
                if (bright >= cutoff) continue;
                const darkness = Math.min(1, (cutoff - bright) / cutoff);
                if (darkness > 0.9) { out[y*w+x]=1; continue; }
                const nLayers = Math.floor(darkness * maxLayers * densityScale);
                if (nLayers < 1) continue;
                let hit = false;
                for (let a = 0; a < Math.min(nLayers, 4); a++) {
                    const proj = x*cosA[a] + y*sinA[a];
                    const pos = ((proj % spacing) + spacing) % spacing;
                    if (pos < lineW) { hit=true; break; }
                }
                if (hit) out[y*w+x] = 1;
            }
            break;
        }
        case 'halftone': {
            const dotSpace = Math.max(3, lab[0]);
            const angle = lab[1] * Math.PI / 180;
            const t = lab[2];
            const cosA = Math.cos(angle), sinA = Math.sin(angle);
            const cx = w/2, cy = h/2;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                // Rotate coordinate
                const rx = (x-cx)*cosA + (y-cy)*sinA + cx;
                const ry = -(x-cx)*sinA + (y-cy)*cosA + cy;
                const bx = ((rx % dotSpace) + dotSpace) % dotSpace;
                const by = ((ry % dotSpace) + dotSpace) % dotSpace;
                const dx = bx - dotSpace/2, dy = by - dotSpace/2;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const maxR = dotSpace * 0.45;
                const bright = gray[y*w+x];
                const targetR = maxR * Math.sqrt(Math.max(0,Math.min(1,(t+127-bright)/255)));
                if (dist < targetR) out[y*w+x] = 1;
            }
            break;
        }
        case 'stipple': {
            const dotR = Math.max(1, lab[0]);
            const density = lab[1]/100;
            const t = lab[2];
            // Use jittered grid for organic feel
            const seed = 7;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const bright = gray[y*w+x];
                if (bright > t) continue;
                const darkness = 1 - bright/t;
                // Probabilistic dot placement
                const hash = Math.abs(Math.sin(x*12.9898+y*78.233+seed)*43758.5453 % 1);
                if (hash < darkness * density) {
                    // Draw dot
                    for (let dy = -dotR; dy <= dotR; dy++) for (let dx = -dotR; dx <= dotR; dx++) {
                        if (dx*dx+dy*dy <= dotR*dotR) {
                            const nx=x+dx, ny=y+dy;
                            if (nx>=0&&nx<w&&ny>=0&&ny<h) out[ny*w+nx]=1;
                        }
                    }
                }
            }
            break;
        }
        case 'woodcut': {
            const spacing = Math.max(2, lab[0]);
            const dir = lab[1] * Math.PI / 180;
            const t = lab[2];
            const cosD = Math.cos(dir), sinD = Math.sin(dir);
            // Flow lines follow gradient direction perpendicular to specified direction
            const gx = new Float32Array(w*h), gy = new Float32Array(w*h);
            for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
                const i=y*w+x;
                gx[i] = gray[i+1]-gray[i-1];
                gy[i] = gray[i+w]-gray[i-w];
            }
            const lineW = Math.max(0.8, spacing * 0.12);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const bright = gray[y*w+x];
                if (bright > t) continue;
                // Project position along flow direction, perturbed by gradient
                const i = y*w+x;
                const perturb = (gx[i]*cosD + gy[i]*sinD) * 0.3 * extra;
                const proj = x*cosD + y*sinD + perturb;
                const pos = ((proj % spacing) + spacing) % spacing;
                if (pos < lineW) out[i] = 1;
                if ((t - bright)/t > 0.9) out[i] = 1;
            }
            break;
        }
        case 'threshold':
        default: {
            for (let i = 0; i < w*h; i++) out[i] = gray[i] < lab[0] ? 1 : 0;
            break;
        }
    }

    // Apply line weight
    if (lw > 0) {
        const d = dilate(out, lw);
        for (let i = 0; i < w*h; i++) out[i] = d[i];
    } else if (lw < 0) {
        const e = erode(out, -lw);
        for (let i = 0; i < w*h; i++) out[i] = e[i];
    }

    return out;
}


function localStats(gray,w,h,radius) {
    const stride=w+1, n=stride*(h+1), sums=new Float64Array(n), squares=new Float64Array(n);
    for(let y=1;y<=h;y++) {
        let s=0, sq=0;
        for(let x=1;x<=w;x++){const v=gray[(y-1)*w+x-1];s+=v;sq+=v*v;sums[y*stride+x]=sums[(y-1)*stride+x]+s;squares[y*stride+x]=squares[(y-1)*stride+x]+sq;}
    }
    const mean=new Float32Array(w*h), std=new Float32Array(w*h);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
        const x0=Math.max(0,x-radius),y0=Math.max(0,y-radius),x1=Math.min(w,x+radius+1),y1=Math.min(h,y+radius+1);
        const a=y0*stride+x0,b=y0*stride+x1,c=y1*stride+x0,d=y1*stride+x1,area=(x1-x0)*(y1-y0),i=y*w+x;
        mean[i]=(sums[d]-sums[b]-sums[c]+sums[a])/area;
        std[i]=Math.sqrt(Math.max(0,(squares[d]-squares[b]-squares[c]+squares[a])/area-mean[i]*mean[i]));
    }
    return {mean,std};
}
const DEFAULTS={boardsWide:7,boardsHigh:4,ratioLocked:true,fitMode:'contain',preset:'manga',labVals:{},gamma:100,denoise:0,localContrast:0,whiteProtect:0,minComponent:0,gapRadius:0,holeFill:0,threshold:128,contrast:0,sharpness:0,extra:3,lineWeight:0,invert:false,smoothing:true,detailboost:false,mixOn:false,mixPreset:'threshold',mixRatio:50,mixMethod:'spatial',mixThresholdB:128,mixExtraB:5,renderMode:'mask',exportMode:'auto',flipOutput:false,planName:'blackboard-plan',quality:18};
const ranges={boardsWide:[1,200],boardsHigh:[1,200],gamma:[50,200],denoise:[0,4],localContrast:[0,100],whiteProtect:[0,100],minComponent:[0,32],gapRadius:[0,2],holeFill:[0,32],threshold:[0,255],contrast:[0,50],sharpness:[0,10],extra:[1,10],lineWeight:[-3,3],mixRatio:[0,100],mixThresholdB:[0,255],mixExtraB:[1,10],quality:[1,112]};
function settings(raw={}) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
    const s=JSON.parse(JSON.stringify(DEFAULTS));
    for(const k of Object.keys(s)){
        if(k==='labVals') continue;
        if(k in ranges){const v=Number(raw[k]);if(Number.isFinite(v)&&raw[k]!==undefined)s[k]=Math.max(ranges[k][0],Math.min(ranges[k][1],Math.round(v)));}
        else if(typeof s[k]==='boolean'&&typeof raw[k]==='boolean')s[k]=raw[k];
    }
    for(const [k,choices] of Object.entries({fitMode:['contain','cover','stretch'],preset:Object.keys(PRESETS),mixPreset:Object.keys(PRESETS),mixMethod:['spatial','add','intersect','edgefill'],renderMode:['mask','chalk'],exportMode:['auto','mask','chalk']})) if(choices.includes(raw[k]))s[k]=raw[k];
    if(typeof raw.planName==='string')s.planName=raw.planName.slice(0,100);
    for(const [k,p] of Object.entries(PRESETS))s.labVals[k]=p.lab.map((cfg,i)=>{const v=Number(raw.labVals?.[k]?.[i]);return Number.isFinite(v)?Math.max(cfg.min,Math.min(cfg.max,Math.round(v))):cfg.def;});
    return s;
}
function preprocess(input,w,h,s) {
    let gray=new Float32Array(input);
    const gamma=s.gamma/100, contrast=1+s.contrast/50;
    for(let i=0;i<gray.length;i++) {
        let v=s.invert?255-gray[i]:gray[i];
        v=Math.pow(v/255,gamma)*255;
        gray[i]=v;
    }
    if(s.denoise)gray=medianFilter(gray,w,h,s.denoise);
    if(s.localContrast)gray=localContrast(gray,w,h,s.localContrast);
    for(let i=0;i<gray.length;i++) {
        let v=gray[i];
        if(v>200)v+=(255-v)*s.whiteProtect/100*0.5;
        gray[i]=Math.max(0,Math.min(255,(v-127.5)*contrast+127.5));
    }
    // One bounded pass prevents Sharpness and Detail boost multiplying each other.
    const sharpening=Math.min(3,s.sharpness*.2+(s.detailboost?1.5+s.extra*.15:0));
    if(sharpening)gray=unsharpMask(gray,w,h,sharpening);
    return gray;
}
function process(input,w,h,s) {
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>3200||h>3200||input.length!==w*h)throw Error('Invalid image dimensions.');
    const gray=preprocess(input,w,h,s);
    return processPrepared(gray,w,h,s);
}
function processPrepared(gray,w,h,s) {
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>3200||h>3200||gray.length!==w*h)throw Error('Invalid image dimensions.');
    let mask=renderPreset(gray,w,h,s.threshold,s.extra,s.lineWeight,s);
    if(s.mixOn){
        const bSettings={...s,preset:s.mixPreset,labVals:{...s.labVals,[s.mixPreset]:[...(s.labVals[s.mixPreset]||PRESETS[s.mixPreset].lab.map(c=>c.def))]}};
        // The secondary threshold is meaningful for threshold-based presets.
        const cfg=PRESETS[s.mixPreset].lab;
        cfg.forEach((v,i)=>{if(v.label==='Threshold')bSettings.labVals[s.mixPreset][i]=s.mixThresholdB;});
        const b=renderPreset(gray,w,h,s.mixThresholdB,s.mixExtraB,s.lineWeight,bSettings),ratio=s.mixRatio/100;
        for(let i=0;i<mask.length;i++){
            const a=mask[i];
            if(s.mixMethod==='add')mask[i]=a|b[i];
            else if(s.mixMethod==='intersect')mask[i]=a&b[i];
            else if(s.mixMethod==='edgefill')mask[i]=a|(b[i]&&gray[i]<s.mixThresholdB?1:0);
            else mask[i]=((BAYER8[(Math.floor(i/w)%8)*8+i%w%8]+0.5)/64<ratio)?b[i]:a;
        }
    }
    if(s.minComponent)mask=removeSmallComponents(mask,w,h,s.minComponent);
    if(s.gapRadius)mask=repairGaps(mask,w,h,s.gapRadius);
    if(s.holeFill)mask=fillHoles(mask,w,h,s.holeFill);
    if(s.flipOutput)for(let i=0;i<mask.length;i++)mask[i]=1-mask[i];
    return mask;
}
function rgba(mask,w,h,mode='mask') {
    const out=new Uint8ClampedArray(w*h*4), ink=mode==='chalk'?[229,232,207]:[0,0,0],paper=mode==='chalk'?[29,39,35]:[255,255,255];
    for(let i=0;i<mask.length;i++){const c=mask[i]?ink:paper;out.set(c,i*4);out[i*4+3]=255;}
    return out;
}
function plan(mask,w,h,s) {
    if(w!==s.boardsWide*16||h!==s.boardsHigh*16||mask.length!==w*h)throw Error('Render the current dimensions before exporting.');
    const boards=[];
    for(let by=0;by<s.boardsHigh;by++)for(let bx=0;bx<s.boardsWide;bx++) {
        const rows=[];let count=0;
        for(let y=0;y<16;y++){let row='';for(let x=0;x<16;x++){const v=mask[(by*16+y)*w+bx*16+x]?1:0;row+=v;count+=v;}rows.push(row);}
        boards.push({x:bx,y:by,blackPixelCount:count,drawPixelCount:count,rows});
    }
    return {kind:'supplementaries-blackboard-plan',version:2,generator:'Blackboard Studio 9.3.2',createdAt:new Date().toISOString(),legend:{'0':'Leave this pixel white.','1':'Draw this pixel as black in Minecraft.'},output:{boardsWide:s.boardsWide,boardsHigh:s.boardsHigh,tileSize:16,preset:s.preset,threshold:s.threshold,contrast:s.contrast,sharpness:s.sharpness,extra:s.extra,fitMode:s.fitMode,invert:false,renderMode:s.renderMode,exportMode:s.exportMode,drawColor:'black',backgroundColor:'white',drawMeaning:'1 means draw; 0 means leave the background.',maskPolarity:'stable',sourceInversionIsIndependent:true,previewMatched:s.renderMode==='mask',sourceInverted:s.invert,exportFlipped:s.flipOutput,totalWidth:w,totalHeight:h},boardCount:boards.length,boards};
}
function wall(s) {
    const {boardsWide:w,boardsHigh:h}=settings(s),block='supplementaries:blackboard',count=w*h;
    const statePosArrayList=`{blockstatemap:[{Name:"${block}",Properties:{facing:"north",waterlogged:"false"}}],endpos:{X:${w-1},Y:${h-1},Z:0},startpos:{X:0,Y:0,Z:0},statelist:[I;${new Array(count).fill(0).join(',')}]}`;
    return {name:`blackboard-wall-${w}x${h}`,statePosArrayList,requiredItems:{[`supplementaries:Reference{ResourceKey[minecraft:item / ${block}]=${block}}`]:count}};
}
// Heuristic only: compare coarse tone and edge preservation, not perceived quality.
function score(mask,gray,w,h) {
    let error=0,blocks=0,isolated=0,filled=0;
    for(let y=0;y<h;y+=8)for(let x=0;x<w;x+=8){let a=0,b=0,n=0;for(let dy=y;dy<Math.min(y+8,h);dy++)for(let dx=x;dx<Math.min(x+8,w);dx++){const i=dy*w+dx;a+=mask[i];b+=1-gray[i]/255;n++;}error+=Math.abs(a-b)/n;blocks++;}
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(mask[i]){filled++;if(!mask[i-1]&&!mask[i+1]&&!mask[i-w]&&!mask[i+w])isolated++;}}
    return 1-error/blocks-(filled?isolated/filled*0.05:0);
}
const api={PRESETS,DEFAULTS,settings,process,processPrepared,preprocess,renderPreset,rgba,plan,wall,score,repairGaps,localStats,BAYER8};
root.BlackboardEngine=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;

})(typeof globalThis!=="undefined"?globalThis:this);
