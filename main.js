var d3; // Minor workaround to avoid error messages in editors

// Specify the chart’s dimensions.
const width = 1400;
const height = 900

const marginTop = 20;
const marginRight = 70;

const marginBottom = 20;
const marginLeft = 50; // Increase margin so labels stays readable

const NUM_KEYS = 7

// Waiting until document has loaded
window.onload = async () => {

  // Loading the dataset with await
  const response = await fetch('data/football.json');
  var data = await response.json();

  const Heading = document.createElement("h2");
  Heading.innerHTML = "Brushable Parallel Coordinates - With vertical Axes";
  document.body.appendChild(Heading)

  //console.log(data);

  data = data['nodes']

  draw_pcp(data)

  draw_splom(data)

};

function draw_pcp(data) {
  var keys = Object.keys(data[0]).filter(
    k => typeof data[0][k] === "number"
  );

  var keyz = keys[0];

  keys = keys.slice(0,NUM_KEYS);

  // Create an horizontal (*y*) scale for each key.
  // const x = new Map(Array.from(keys, key => [key, d3.scaleLinear(d3.extent(data, d => d[key]), [marginLeft, width - marginRight])]));
  const y = new Map(Array.from(keys, key => [key, d3.scaleLinear(d3.extent(data, d => d[key]), [marginTop, height - marginBottom])]));

  // Create the vertical (*x*) scale.
  // const y = d3.scalePoint(keys, [marginTop, height - marginBottom]);
  const x = d3.scalePoint(keys, [marginLeft, width - marginRight]);
 

  // Create the color scale.
  const color = d3.scaleSequential(y.get(keyz).domain(), t => d3.interpolateBrBG(1 - t));

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto;");

  // Append the lines.
  const line = d3.line()
    .defined(([, value]) => value != null)
    .x(([key]) => x(key))  // Horizontal lines
    .y(([key, value]) => y.get(key)(value));

    // vertical lines
    // .x(([key, value]) => y.get(key)(value))
    // .y(([key]) => x(key));

  const path = svg.append("g")
      .attr("fill", "none")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.4)
      .selectAll("path")
      .data(data.slice().sort((a, b) => d3.ascending(a[keyz], b[keyz])))
      .join("path")
      .attr("stroke", d => color(d[keyz]))
      .attr("d", d => line(d3.cross(keys, [d], (key, d) => [key, d[key]])))
      .call(path => path.append("title")
      .text(d => d.name));

  // Append the axis for each key.
  const axes = svg.append("g")
    .selectAll("g")
    .data(keys)
    .join("g")
      .attr("transform", d => `translate(${x(d)},0)`) // Translate along first vector component
      .each(function(d) { d3.select(this).call(d3.axisLeft(y.get(d))); }) // Axis left instead of axis bottom
      .call(g => g.append("text")
        .attr("y", marginTop-10)
        .attr("x", 0)
        .attr("text-anchor", "middle") // This just looks nicer
        .attr("fill", "currentColor")
        .text(d => d))
      .call(g => g.selectAll("text")
        .clone(true).lower()
        .attr("fill", "none")
        .attr("stroke-width", 5)
        .attr("stroke-linejoin", "round")
        .attr("stroke", "white"));


  // Create the brush behavior.
  const deselectedColor = "#ddd";
  const brushHeight = 50;
  const brush = d3.brushY()
      .extent([
        // [marginLeft, -(brushHeight / 2)],
        // [width - marginRight, brushHeight / 2]
        [-(brushHeight / 2), marginTop],
        [brushHeight / 2, height - marginBottom]  // Move this around so that the brush works
      ])
      .on("start brush end", brushed);

  axes.call(brush);

  const selections = new Map();

  function brushed({selection}, key) {
    if (selection === null) selections.delete(key);
    else selections.set(key, selection.map(y.get(key).invert));
    const selected = [];
    path.each(function(d) {
      const active = Array.from(selections).every(([key, [min, max]]) => d[key] >= min && d[key] <= max);
      d3.select(this).style("stroke", active ? color(d[keyz]) : deselectedColor);
      if (active) {
        d3.select(this).raise();
        selected.push(d);
      }
    });
    svg.property("value", selected).dispatch("input");
  }

  document.body.appendChild(svg.node());
}


function draw_splom(data) {

    var keys = Object.keys(data[0]).filter(
        k => typeof data[0][k] === "number"
    );

    keys = keys.slice(0,NUM_KEYS);


  const Heading = document.createElement("h2");
  Heading.innerHTML = "Brushable Scatterplot Matrix - with Bottom Left to Top right diagonal";
  document.body.appendChild(Heading)

  // Specify the chart’s dimensions.
  const padding = 20;
  const height = width;
  const size = (width - (keys.length + 1) * padding) / keys.length + padding;

  // Define the horizontal scales (one for each row).
  const x = keys.map(c => d3.scaleLinear()
      .domain(d3.extent(data, d => d[c]))
      .rangeRound([padding / 2, size - padding / 2]))


  // Define the companion vertical scales (one for each column).
  // const y = x_reversed.map(x_reversed => x_reversed.copy().range([size - padding / 2, padding / 2]));

  const y = keys.map(c => d3.scaleLinear()
      .domain(d3.extent(data, d => d[c]))
      .rangeRound([size - padding / 2, padding / 2])); // reversed range to construct y


  // Define the color scale.
  const color = d3.scaleOrdinal(['green'])

  // Define the horizontal axis (it will be applied separately for each column).
  const axisx = d3.axisBottom()
      .ticks(6)
      .tickSize(size * keys.length);
  const xAxis = g => g.selectAll("g").data(x).join("g")
      .attr("transform", (d, i) => `translate(${i * size},0)`)
      .each(function(d) { return d3.select(this).call(axisx.scale(d)); })
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "#ddd"));

  // Define the vertical axis (it will be applied separately for each row).
  const axisy = d3.axisLeft()
      .ticks(6)
      .tickSize(-size * keys.length);
  const yAxis = g => g.selectAll("g").data(y).join("g")
      .attr("transform", (d, i) => `translate(0,${(keys.length - 1 -i) * size})`) // Substract current i index from keys.lenght to build chart from bottom to top
      .each(function(d) { return d3.select(this).call(axisy.scale(d)); })
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "#ddd"));
  
  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-padding, 0, width, height]);

  svg.append("style")
      .text(`circle.hidden { fill: #000; fill-opacity: 1; r: 1px; }`);

  svg.append("g")
      .call(xAxis);

  svg.append("g")
      .call(yAxis);


  var n = keys.length
  const cell = svg.append("g")
    .selectAll("g")
    .data(d3.cross(d3.range(n), d3.range(n)))
    .join("g")
      .attr("transform", ([i, j]) => `translate(${i * size},${ (n - 1 - j) * size})`); // Substract current j index from keys.lenght to build chart from bottom to top

  cell.append("rect")
      .attr("fill", "none")
      .attr("stroke", "#aaa")
      .attr("x", padding / 2 + 0.5)
      .attr("y", padding / 2 + 0.5)
      .attr("width", size - padding)
      .attr("height", size - padding);

  cell.each(function([i, j]) {
    d3.select(this).selectAll("circle")
      .data(data.filter(d => !isNaN(d[keys[i]]) && !isNaN(d[keys[j]])))
      .join("circle")
        .attr("cx", d => x[i](d[keys[i]]))
        .attr("cy", d => y[j](d[keys[j]]));
  });

  const circle = cell.selectAll("circle")
      .attr("r", 3.5)
      .attr("fill-opacity", 0.7)
      .attr("fill", d => color(d.species));

  // Ignore this line if you don't need the brushing behavior.
  cell.call(brush_splom, circle, svg, {padding, size, x, y, keys});

  svg.append("g")
      .style("font", "bold 10px sans-serif")
      .style("pointer-events", "none")
    .selectAll("text")
    .data(keys)
    .join("text")
      .attr("transform", (d, i) => `translate(${i * size},${(keys.length - 1 - i) * size})`)
      .attr("x", padding)
      .attr("y", padding)
      .attr("dy", ".71em")
      .text(d => d);

  svg.property("value", [])
  document.body.appendChild(svg.node());

  function brush_splom(cell, circle, svg, {padding, size, x, y, keys}) {
  const brush = d3.brush()
      .extent([[padding / 2, padding / 2], [size - padding / 2, size - padding / 2]])
      .on("start", brushstarted)
      .on("brush", brushed)
      .on("end", brushended);

  cell.call(brush);

  let brushCell;

  // Clear the previously-active brush, if any.
  function brushstarted() {
    if (brushCell !== this) {
      d3.select(brushCell).call(brush.move, null);
      brushCell = this;
    }
  }

  // Highlight the selected circles.
  function brushed({selection}, [i, j]) {
    let selected = [];
    if (selection) {
      const [[x0, y0], [x1, y1]] = selection; 
      circle.classed("hidden",
        d => x0 > x[i](d[keys[i]])
          || x1 < x[i](d[keys[i]])
          || y0 > y[j](d[keys[j]])
          || y1 < y[j](d[keys[j]]));
      selected = data.filter(
        d => x0 < x[i](d[keys[i]])
          && x1 > x[i](d[keys[i]])
          && y0 < y[j](d[keys[j]])
          && y1 > y[j](d[keys[j]]));
    }
    svg.property("value", selected).dispatch("input");
  }

  // If the brush is empty, select all circles.
  function brushended({selection}) {
    if (selection) return;
    svg.property("value", []).dispatch("input");
    circle.classed("hidden", false);
  }
}


}

