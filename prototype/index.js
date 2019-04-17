// vertex shader text
const VTST = [
  'precision mediump float;',
  '',
  'attribute vec2 vertPosition;', // position 2d
  'attribute vec3 vertColor;', // color
  'varying vec3 fragColor;',
  '',
  'void main()',
  '{',
  '  fragColor = vertColor;',
  '  gl_Position = vec4(vertPosition, 0.0, 1.0);',
  '}',
].join('\n');

// fragment shader text
const FGST = [
  'precision mediump float;',
  'varying vec3 fragColor;',
  '',
  'void main()',
  '{',
  '  gl_FragColor = vec4(fragColor, 1.0);',
  '}',
].join('\n');

function init() {
  console.log('initing');

  const canvas = document.getElementById('app');
  const gl = canvas.getContext('webgl');

  if (!gl) { alert('unsupported browser'); }

  // do this to set view resolution
  canvas.width = 800;
  canvas.height = 450;

  // do this to set render resolution
  gl.viewport(0, 0, 800, 450);

  // set clearcolor (red, green, blue, alpha); between 0 => 1
  gl.clearColor(0.2, 0.2, 0.2, 1.0);

  // clear main buffers [color and depth], there are others :)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // create shader namespaces
  const vertexShader = gl.createShader(gl.VERTEX_SHADER)
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

  // set shaders to use, (namespace, sourcecode)
  gl.shaderSource(vertexShader, VTST);
  gl.shaderSource(fragmentShader, FGST);

  // compile shaders
  gl.compileShader(vertexShader);

  // validate vertex shader compiled
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error('ERROR COMPLING VERTEX SHADER', gl.getShaderInfoLog(vertexShader));
    return;
  }

  // compile fragment shader
  gl.compileShader(fragmentShader);

  // validate fragment shader compiled
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error('ERROR COMPLING VERTEX SHADER', gl.getShaderInfoLog(fragmentShader));
    return;
  }

  // combine shaders for webgl program and attach the shaders
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // link program to gl context
  gl.linkProgram(program);

  // validate it linked
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('ERROR LINKING PROGRAM', gl.getProgramInfoLog(program));
    return;
  }

  // validate program, only do this in testing :)
  gl.validateProgram(program);
  if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
    console.error( 'ERROR VALIDATING PROGRAM', gl.getProgramInfoLog(program));
    return;
  }

  // creat buffers
  const triangleVerticies = [ // expects x, y, r, g, b
    0.0, 0.5, 1.0, 0.0, 0.0,
    -0.5, -0.5, 0.0, 1.0, 0.0,
    0.5, -0.5, 0.0, 0.0, 1.0,
  ];

  // create object on gpu
  const triangleVertexBufferObject = gl.createBuffer();

  // bind the cpu buffer to gpu buffer (buffertype, bufferobject)
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBufferObject);

  // bind the array to the buffer (buffertype, buffer as typed buffer, render variance)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVerticies), gl.STATIC_DRAW);

  // gets attribute from gl program (program => vert, namespace)
  const positionAttribLocation = gl.getAttribLocation(program, 'vertPosition'); // position
  const colorAttribLocation = gl.getAttribLocation(program, 'vertColor'); // color

  // run position
  gl.vertexAttribPointer(
    positionAttribLocation, // attribute location
    2, // number of elements per attribute
    gl.FLOAT, // type of the elements
    gl.FALSE, // data normalized
    5 * Float32Array.BYTES_PER_ELEMENT, // size of an individual vertex
    0, // offset from the beginning of a single vertex to this attribute
  );

  // run color
  gl.vertexAttribPointer(
    colorAttribLocation, // attribute location
    3, // number of elements per attribute
    gl.FLOAT, // type of the elements
    gl.FALSE, // data normalized
    5 * Float32Array.BYTES_PER_ELEMENT, // size of an individual vertex
    2 * Float32Array.BYTES_PER_ELEMENT, // offset from the beginning of a single vertex to this attribute
  );

  // enable
  gl.enableVertexAttribArray(positionAttribLocation);
  gl.enableVertexAttribArray(colorAttribLocation);

  // main renderer

  function loop() {
    // set program to use
    gl.useProgram(program);

    // draw the bound buffer (type you are drawing, skip, count)
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  loop();
}