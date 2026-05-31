var d3; // Minor workaround to avoid error messages in editors

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

  const keys = Object.keys(data[0]).filter(
    k => typeof data[0][k] === "number"
  );

  var keyz = keys[0];

  
  // Specify the chart’s dimensions.
  const width = 1400;
  const height = 900

  const marginTop = 20;
  const marginRight = 70;
 
  const marginBottom = 20;
  const marginLeft = 50; // Increase margin so labels stays readable

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
  
};
