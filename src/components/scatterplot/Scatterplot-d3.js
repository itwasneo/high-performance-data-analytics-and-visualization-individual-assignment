import * as d3 from 'd3'

const ATTR_LABELS = {
    medIncome: 'Median Income (normalized)',
    ViolentCrimesPerPop: 'Violent Crimes Per Pop. (normalized)',
    population: 'Population (normalized)',
};

const CRIME_INTERPOLATOR = t => d3.interpolateYlOrRd(t * 0.80 + 0.20);

const THEME_COLORS = {
    light: { bg: '#ffffff', axis: '#444444', label: '#444444' },
    dark:  { bg: '#0d1117', axis: '#9198a1', label: '#9198a1' },
};

const CLIP_PAD = 10;

class ScatterplotD3 {
    margin = { top: 20, right: 30, bottom: 55, left: 70 };
    size; height; width; svg;
    markerGroup;
    defaultOpacity = 0.45;
    circleRadius = 3;
    xScale; yScale; colorScale;
    brush; brushG;
    currentXAttr; currentYAttr;
    theme = 'light';

    constructor(el) { this.el = el; }

    create(config, theme = 'light') {
        if (!this.el) return;
        this.theme = theme;
        const tc = THEME_COLORS[theme];

        this.size = { width: config.size.width || 500, height: config.size.height || 400 };
        this.width  = this.size.width  - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top  - this.margin.bottom;

        d3.select(this.el).selectAll("svg").remove();

        const fullSvg = d3.select(this.el).append("svg")
            .attr("width",  this.size.width)
            .attr("height", this.size.height);

        fullSvg.append("rect")
            .attr("class", "svg-bg")
            .attr("width",  this.size.width)
            .attr("height", this.size.height)
            .attr("fill", tc.bg);

        this.svg = fullSvg.append("g")
            .attr("class", "svgG")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.svg.append("defs").append("clipPath")
            .attr("id", "scatter-clip")
            .append("rect")
            .attr("class", "scatter-clip-rect")
            .attr("x", -CLIP_PAD).attr("y", -CLIP_PAD)
            .attr("width",  this.width  + CLIP_PAD * 2)
            .attr("height", this.height + CLIP_PAD * 2);

        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);
        this.colorScale = d3.scaleSequential(CRIME_INTERPOLATOR);

        this.svg.append("g").attr("class", "xAxisG")
            .attr("transform", `translate(0,${this.height})`);
        this.svg.append("g").attr("class", "yAxisG");

        this.svg.append("text").attr("class", "xAxisLabel")
            .attr("x", this.width / 2)
            .attr("y", this.height + this.margin.bottom - 8)
            .attr("text-anchor", "middle")
            .style("font-size", "11px").style("fill", tc.label);

        this.svg.append("text").attr("class", "yAxisLabel")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", -this.margin.left + 14)
            .attr("text-anchor", "middle")
            .style("font-size", "11px").style("fill", tc.label);

        // Brush is appended BEFORE markerGroup so the circles sit above it in SVG
        // z-order. This lets native mouseenter/mouseleave fire on individual circles
        // without any hit-test loop, eliminating the jitter caused by dispatching
        // Redux actions on every mousemove.
        this.brush = d3.brush()
            .extent([[0, 0], [this.width, this.height]])
            .on("end", (event) => this.handleBrushEnd(event));

        this.brushG = this.svg.append("g").attr("class", "brush").call(this.brush);

        this.brushG.select(".overlay")
            .on("mouseenter.clearHover", () => this.controllerMethods?.handleOnMouseLeave());

        // markerGroup appended after brushG — circles are now on top
        this.markerGroup = this.svg.append("g")
            .attr("class", "markerGroup")
            .attr("clip-path", "url(#scatter-clip)");

        this.controllerMethods = null;
        this.visData = [];
    }

    handleBrushEnd(event) {
        if (!this.controllerMethods) return;
        if (!event.selection) { this.controllerMethods.handleBrush([]); return; }
        const [[x0, y0], [x1, y1]] = event.selection;
        const selected = this.visData
            .filter(d => {
                const cx = this.xScale(d[this.currentXAttr]);
                const cy = this.yScale(d[this.currentYAttr]);
                return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
            })
            .map(d => d.index);
        this.controllerMethods.handleBrush(selected);
    }

    highlightSelectedItems(selectedItems, hoveredItem) {
        const selectedSet = new Set(selectedItems);
        const hasSelection = selectedSet.size > 0 || hoveredItem !== null;
        this.markerGroup.selectAll(".markerG").each(function(d) {
            const isHovered  = d.index === hoveredItem;
            const isSelected = selectedSet.has(d.index);
            const opacity = isHovered ? 1 : (isSelected ? 0.9 : (hasSelection ? 0.04 : 0.45));
            const r      = isHovered ? 7 : (isSelected ? 5 : 3);
            const stroke = isHovered ? "#000" : (isSelected ? "#333" : "none");
            d3.select(this)
                .style("opacity", opacity)
                .select("circle")
                .attr("r", r)
                .attr("stroke", stroke)
                .attr("stroke-width", isHovered ? 2 : 1);
            if (isHovered || isSelected) d3.select(this).raise();
        });
    }

    renderScatterplot(visData, xAttribute, yAttribute, controllerMethods, theme = 'light') {
        this.theme = theme;
        const tc = THEME_COLORS[theme];

        const plotData = visData.filter(d =>
            typeof d[xAttribute] === 'number' && isFinite(d[xAttribute]) &&
            typeof d[yAttribute] === 'number' && isFinite(d[yAttribute])
        );

        this.visData = plotData;
        this.controllerMethods = controllerMethods;
        this.currentXAttr = xAttribute;
        this.currentYAttr = yAttribute;

        this.xScale.domain(d3.extent(plotData, d => d[xAttribute])).nice();
        this.yScale.domain(d3.extent(plotData, d => d[yAttribute])).nice();
        this.colorScale.domain([0, d3.max(plotData, d => d[yAttribute])]);

        d3.select(this.el).select(".svg-bg").attr("fill", tc.bg);

        const axisStyle = sel => {
            sel.selectAll("text").attr("fill", tc.axis);
            sel.selectAll(".domain, .tick line").attr("stroke", tc.axis);
        };
        this.svg.select(".xAxisG").call(d3.axisBottom(this.xScale).ticks(6)).call(axisStyle);
        this.svg.select(".yAxisG").call(d3.axisLeft(this.yScale).ticks(6)).call(axisStyle);
        this.svg.select(".xAxisLabel").style("fill", tc.label).text(ATTR_LABELS[xAttribute] || xAttribute);
        this.svg.select(".yAxisLabel").style("fill", tc.label).text(ATTR_LABELS[yAttribute] || yAttribute);

        this.markerGroup.selectAll(".markerG")
            .data(plotData, d => d.index)
            .join(
                enter => {
                    const g = enter.append("g").attr("class", "markerG");
                    g.append("circle")
                        .attr("r", this.circleRadius)
                        .attr("fill", d => this.colorScale(d[yAttribute]));
                    g.append("title").text(d => {
                        const fmt = v => (typeof v === 'number' && !isNaN(v)) ? v.toFixed(3) : (v ?? 'N/A');
                        return `${d.communityname}\n${xAttribute}: ${fmt(d[xAttribute])}\n${yAttribute}: ${fmt(d[yAttribute])}`;
                    });
                    return g;
                },
                update => update,
                exit   => exit.remove()
            )
            // Attach hover events to the merged selection (enter + update) so they
            // work both on first render and on data/theme updates.
            .on("mouseenter", (e, d) => this.controllerMethods?.handleOnMouseEnter(d))
            .on("mouseleave", ()     => this.controllerMethods?.handleOnMouseLeave())
            .attr("transform", d => `translate(${this.xScale(d[xAttribute])},${this.yScale(d[yAttribute])})`);

        this.brushG.call(this.brush.move, null);
    }

    resize(size) {
        if (!this.el) return;
        this.size = { width: size.width || 500, height: size.height || 400 };
        this.width  = this.size.width  - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top  - this.margin.bottom;

        d3.select(this.el).select("svg")
            .attr("width",  this.size.width)
            .attr("height", this.size.height);
        d3.select(this.el).select(".svg-bg")
            .attr("width",  this.size.width)
            .attr("height", this.size.height);

        this.xScale.range([0, this.width]);
        this.yScale.range([this.height, 0]);

        this.svg.select(".xAxisG").attr("transform", `translate(0,${this.height})`);
        this.svg.select(".xAxisLabel")
            .attr("x", this.width / 2)
            .attr("y", this.height + this.margin.bottom - 8);
        this.svg.select(".yAxisLabel").attr("x", -this.height / 2);

        this.svg.select(".scatter-clip-rect")
            .attr("x", -CLIP_PAD).attr("y", -CLIP_PAD)
            .attr("width",  this.width  + CLIP_PAD * 2)
            .attr("height", this.height + CLIP_PAD * 2);

        this.brush.extent([[0, 0], [this.width, this.height]]);
        this.brushG.call(this.brush);
    }

    clear() { d3.select(this.el).selectAll("*").remove(); }
}

export default ScatterplotD3;
