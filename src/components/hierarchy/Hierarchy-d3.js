import * as d3 from 'd3'

// FIPS numeric state codes → 2-letter abbreviations
const FIPS = {
    1:'AL', 2:'AK', 4:'AZ', 5:'AR', 6:'CA', 8:'CO', 9:'CT',
    10:'DE', 11:'DC', 12:'FL', 13:'GA', 15:'HI', 16:'ID', 17:'IL',
    18:'IN', 19:'IA', 20:'KS', 21:'KY', 22:'LA', 23:'ME', 24:'MD',
    25:'MA', 26:'MI', 27:'MN', 28:'MS', 29:'MO', 30:'MT', 31:'NE',
    32:'NV', 33:'NH', 34:'NJ', 35:'NM', 36:'NY', 37:'NC', 38:'ND',
    39:'OH', 40:'OK', 41:'OR', 42:'PA', 44:'RI', 45:'SC', 46:'SD',
    47:'TN', 48:'TX', 49:'UT', 50:'VT', 51:'VA', 53:'WA', 54:'WV',
    55:'WI', 56:'WY'
};

// Shifted interpolator — identical to the scatterplot scale for visual consistency.
// t=0 maps to ~0.20 in YlOrRd so the minimum colour is a visible orange, not near-white.
const CRIME_INTERPOLATOR = t => d3.interpolateYlOrRd(t * 0.80 + 0.20);

const THEME_COLORS = {
    light: {
        bg:              '#ffffff',
        stateTile:       '#e0e0e0',
        stateTileStroke: '#bbb',
        stateLabel:      '#333333',
        legendText:      '#555555',
        legendSubText:   '#888888',
    },
    dark: {
        bg:              '#0d1117',
        stateTile:       '#21262d',
        stateTileStroke: '#484f58',
        stateLabel:      '#c9d1d9',
        legendText:      '#8b949e',
        legendSubText:   '#6e7681',
    },
};

class HierarchyD3 {
    // Bottom margin reserved for the colour legend
    margin = { top: 5, right: 10, bottom: 52, left: 10 };
    size; height; width;
    svgEl; svg; legendG;
    defaultOpacity = 0.85;
    transitionDuration = 600;
    colorScale;
    theme = 'light';

    constructor(el) { this.el = el; }

    create(config, theme = 'light') {
        if (!this.el) return;
        this.theme = theme;
        this.size = { width: config.size.width || 500, height: config.size.height || 500 };
        this.width  = this.size.width  - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top  - this.margin.bottom;

        d3.select(this.el).selectAll("svg").remove();

        this.svgEl = d3.select(this.el).append("svg")
            .attr("width",  this.size.width)
            .attr("height", this.size.height);

        // Theme background
        this.svgEl.append("rect")
            .attr("class", "svg-bg")
            .attr("width",  this.size.width)
            .attr("height", this.size.height)
            .attr("fill", THEME_COLORS[theme].bg);

        this.svg = this.svgEl.append("g")
            .attr("class", "svgG")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.legendG = this.svgEl.append("g")
            .attr("class", "legendG")
            .attr("transform", `translate(${this.margin.left},${this.size.height - this.margin.bottom + 8})`);

        this.colorScale = d3.scaleSequential(CRIME_INTERPOLATOR);
        this._buildLegend(theme);
    }

    _buildLegend(theme) {
        const tc = THEME_COLORS[theme || this.theme];
        this.legendG.selectAll("*").remove();
        const lw = Math.max(120, Math.min(280, this.width));
        const lh = 10;
        const gradId = "hier-crime-gradient";

        let defs = this.svgEl.select("defs");
        if (defs.empty()) defs = this.svgEl.append("defs");
        defs.select(`#${gradId}`).remove();

        const grad = defs.append("linearGradient")
            .attr("id", gradId).attr("x1", "0%").attr("x2", "100%");
        // Match the shifted interpolator used for actual data colours
        d3.range(0, 1.01, 0.05).forEach(t =>
            grad.append("stop")
                .attr("offset", `${t * 100}%`)
                .attr("stop-color", CRIME_INTERPOLATOR(t))
        );

        this.legendG.append("rect")
            .attr("width", lw).attr("height", lh)
            .style("fill", `url(#${gradId})`);

        this.legendG.append("text")
            .attr("y", lh + 13)
            .style("font-size", "10px").style("fill", tc.legendText)
            .text("Low crime");

        this.legendG.append("text")
            .attr("x", lw).attr("y", lh + 13)
            .attr("text-anchor", "end")
            .style("font-size", "10px").style("fill", tc.legendText)
            .text("High violent crime rate");

        this.legendG.append("text")
            .attr("x", lw / 2).attr("y", lh + 26)
            .attr("text-anchor", "middle")
            .style("font-size", "9px").style("fill", tc.legendSubText)
            .text("Color = avg ViolentCrimesPerPop  |  Size = population");
    }

    resize(size) {
        if (!this.el) return;
        this.size = { width: size.width || 500, height: size.height || 500 };
        this.width  = this.size.width  - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top  - this.margin.bottom;

        this.svgEl.attr("width", this.size.width).attr("height", this.size.height);
        this.svgEl.select(".svg-bg").attr("width", this.size.width).attr("height", this.size.height);
        this.legendG.attr("transform",
            `translate(${this.margin.left},${this.size.height - this.margin.bottom + 8})`);
        this._buildLegend();
    }

    highlightSelectedItems(selectedItems, hoveredItem) {
        const selectedSet = new Set(selectedItems);
        const hasSelection = selectedSet.size > 0;

        // Build active set from brush selection only — hover does not trigger dimming.
        const activeNodes = new Set();
        if (hasSelection) {
            this.svg.selectAll(".node--leaf").each(d => {
                if (selectedSet.has(d.data.index)) {
                    let curr = d;
                    while (curr) { activeNodes.add(curr); curr = curr.parent; }
                }
            });
        }

        // Accent colour that pops against both the data colours and the theme background.
        // A vivid blue reads clearly in light mode; a bright cyan/white reads in dark mode.
        const hoverStroke = this.theme === 'dark' ? '#ffffff' : '#1a56db';

        this.svg.selectAll(".node").each(function(d) {
            const isHovered = d.data && d.data.index === hoveredItem;
            const isActive  = !hasSelection || activeNodes.has(d);

            // Opacity: only the brush selection dims non-active nodes.
            // Hover leaves all opacities untouched so the view stays readable.
            d3.select(this).style("opacity", isHovered ? 1 : (isActive ? 0.85 : 0.07));

            // Hovered node: bright thick ring + raised above its neighbours.
            d3.select(this).selectAll(".node-circle, .node-rect")
                .attr("stroke",       isHovered ? hoverStroke : null)
                .attr("stroke-width", isHovered ? 3           : null);

            if (isHovered) d3.select(this).raise();
        });
    }

    renderVis(visData, valueAttribute, colorAttribute, layoutMode, controllerMethods, theme = 'light') {
        this.theme = theme;
        const tc = THEME_COLORS[theme];

        // Update background colour on theme switch
        this.svgEl.select(".svg-bg").attr("fill", tc.bg);
        this._buildLegend(theme);

        const grouped = d3.group(visData, d => d.state);
        const rootNode = {
            name: "US",
            children: Array.from(grouped, ([fips, comms]) => ({
                name: FIPS[+fips] || `St.${fips}`,
                stateFips: +fips,
                children: comms
            }))
        };

        const root = d3.hierarchy(rootNode)
            .sum(d => (!d.children && typeof d[valueAttribute] === 'number' && d[valueAttribute] > 0)
                ? d[valueAttribute] : 0)
            .sort((a, b) => b.value - a.value);

        // Propagate average colorAttribute value bottom-up
        root.eachAfter(node => {
            node.colorValue = node.children
                ? (d3.mean(node.children, c => c.colorValue) || 0)
                : (typeof node.data[colorAttribute] === 'number' ? node.data[colorAttribute] : 0);
        });

        this.colorScale.domain([0, d3.max(visData, d =>
            typeof d[colorAttribute] === 'number' ? d[colorAttribute] : 0)]);

        let nodes;
        if (layoutMode === 'treemap') {
            nodes = d3.treemap()
                .size([this.width, this.height])
                .paddingOuter(3)
                .paddingTop(16)
                .paddingInner(1)
                (root).descendants();
        } else {
            nodes = d3.pack()
                .size([this.width, this.height])
                .padding(3)
                (root).descendants();
        }

        const display  = nodes.filter(d => d.depth > 0);
        const nodeKey  = d => d.depth === 1
            ? `state-${d.data.stateFips}`
            : `comm-${d.data.communityname}-${d.data.index}`;

        const sel = this.svg.selectAll(".node").data(display, nodeKey);

        const enter = sel.enter().append("g")
            .attr("class", d => `node ${d.children ? "node--internal" : "node--leaf"}`)
            .style("opacity", this.defaultOpacity)
            .on("mouseenter", (event, d) => controllerMethods.handleOnMouseEnter(d))
            .on("mouseleave", () => controllerMethods.handleOnMouseLeave());

        enter.append("rect").attr("class",    "node-rect");
        enter.append("circle").attr("class",  "node-circle");
        enter.append("text").attr("class",    "node-label").attr("pointer-events", "none");
        enter.append("title");

        const update = enter.merge(sel);

        const fmt = v => (typeof v === 'number' && !isNaN(v)) ? v.toFixed(3) : (v ?? 'N/A');
        update.select("title").text(d => d.children
            ? `${d.data.name} — ${d.children.length} communities\nAvg crime: ${fmt(d.colorValue)}`
            : `${d.data.communityname}\nPopulation: ${fmt(d.data[valueAttribute])}\nViolent crime: ${fmt(d.data[colorAttribute])}`
        );

        const t  = d3.transition().duration(this.transitionDuration);
        const cs = this.colorScale;

        if (layoutMode === 'treemap') {
            update.transition(t)
                .attr("transform", d => `translate(${d.x0},${d.y0})`);

            update.select(".node-circle").transition(t).attr("r", 0).style("opacity", 0);

            update.select(".node-rect")
                .transition(t)
                .attr("width",  d => Math.max(0, d.x1 - d.x0))
                .attr("height", d => Math.max(0, d.y1 - d.y0))
                .attr("fill",   d => d.children ? tc.stateTile : cs(d.colorValue))
                .attr("stroke", d => d.children ? tc.stateTileStroke : null)
                .attr("stroke-width", d => d.children ? 0.5 : null)
                .style("opacity", 1);

            update.select(".node-label")
                .transition(t)
                .attr("x",  d => d.children ? 3 : (d.x1 - d.x0) / 2)
                .attr("y",  d => d.children ? 12 : (d.y1 - d.y0) / 2)
                .attr("dy", d => d.children ? null : "0.35em")
                .attr("text-anchor", d => d.children ? "start" : "middle")
                .attr("font-size",   d => d.children ? "10px" : "7.5px")
                .attr("font-weight", d => d.children ? "600" : null)
                .attr("fill", d => {
                    if (d.children) return tc.stateLabel;
                    return d.colorValue > 0.55 ? "#fff" : (theme === 'dark' ? "#e6edf3" : "#222");
                })
                .text(d => {
                    if (d.children) return d.data.name;
                    return (d.x1 - d.x0 > 42 && d.y1 - d.y0 > 14) ? d.data.communityname : "";
                });

        } else {
            update.transition(t)
                .attr("transform", d => `translate(${d.x},${d.y})`);

            update.select(".node-rect").transition(t)
                .attr("width", 0).attr("height", 0).style("opacity", 0);

            update.select(".node-circle").transition(t)
                .attr("r",    d => Math.max(0, d.r))
                .attr("fill",   d => d.children ? "none" : cs(d.colorValue))
                .attr("stroke", d => d.children ? tc.stateTileStroke : null)
                .attr("stroke-width", d => d.children ? 1.5 : null)
                .style("opacity", 1);

            update.select(".node-label")
                .transition(t)
                .attr("x", 0)
                .attr("y", d => d.children ? -d.r + Math.min(14, d.r * 0.25) : 0)
                .attr("dy", d => d.children ? null : "0.35em")
                .attr("text-anchor", "middle")
                .attr("font-size",   d => d.children
                    ? `${Math.max(7, Math.min(11, d.r * 0.3))}px`
                    : "7px")
                .attr("font-weight", d => d.children ? "600" : null)
                .attr("fill", d => {
                    if (d.children) return tc.stateLabel;
                    return d.colorValue > 0.55 ? "#fff" : (theme === 'dark' ? "#e6edf3" : "#222");
                })
                .text(d => {
                    if (d.children) return d.r > 14 ? d.data.name : "";
                    return d.r > 9 ? d.data.communityname : "";
                });
        }

        sel.exit().remove();
        this.svg.selectAll(".node--leaf").raise();
    }

    clear() { d3.select(this.el).selectAll("*").remove(); }
}

export default HierarchyD3;
