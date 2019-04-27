function loadResource(url, type) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(r => r[type]())
      .then((r) => {
        resolve(r);
      })
      .catch((e) => {
        reject(e);
      });
  });
}

function init() {
  return new Promise((resolve, reject) => {
    console.log('initing');

    let fst;
    let vst;

    const data = {};

    loadResource('shaders/fs.glsl', 'text')
      .then((r) => {
        fst = r;
        return loadResource('shaders/vs.glsl', 'text');
      })
      .then((r) => {
        vst = r;
        return loadResource('models/Avocado.gltf', 'json');
      })
      .then((r) => {
        data.gltf = r;

        // use gltf data to find bin file
        console.log(r.buffers);
        return loadResource(`models/${r.buffers[0].uri}`, 'arrayBuffer');
      })
      .then((r) => {
        data.bin = r;

        // use gltf data to get all images for model
        return Promise.all(
          data.gltf.images.map(image => loadResource(`models/${image.uri}`, 'blob')),
        );
      })
      .then((r) => {
        data.textures = r;
        const d = dataCheck(data);
        this.start(fst, vst, d);

        resolve();
      })
  });
}

function dataCheck(data) {
  console.log(data);

  // destructure
  const { gltf, bin, textures } = data;

  const b = {
    "5126": 4,
    "5123": 2,
  };

  // start grabbing mesh data

  // get primatives
  const meshPrims = gltf.meshes[0].primitives[0];

  console.log(meshPrims.indices);

  const vNormals = new Float32Array(
    bin,
    gltf.bufferViews[gltf.accessors[meshPrims.attributes.NORMAL].bufferView].byteOffset,
    gltf.bufferViews[gltf.accessors[meshPrims.attributes.NORMAL].bufferView].byteLength
      / b[gltf.accessors[meshPrims.attributes.NORMAL].componentType]
  );

  const vPositions = new Float32Array(
    bin,
    gltf.bufferViews[gltf.accessors[meshPrims.attributes.POSITION].bufferView].byteOffset,
    gltf.bufferViews[gltf.accessors[meshPrims.attributes.POSITION].bufferView].byteLength
      / b[gltf.accessors[meshPrims.attributes.POSITION].componentType]
  );

  const vTangents = new Float32Array(
    bin,
    gltf.bufferViews[gltf.accessors[meshPrims.attributes.TANGENT].bufferView].byteOffset,
    gltf.bufferViews[gltf.accessors[meshPrims.attributes.TANGENT].bufferView].byteLength
      / b[gltf.accessors[meshPrims.attributes.TANGENT].componentType]
  );

  const vTextCoords = new Float32Array(
    bin,
    gltf.bufferViews[gltf.accessors[meshPrims.attributes.TEXCOORD_0].bufferView].byteOffset,
    gltf.bufferViews[gltf.accessors[meshPrims.attributes.TEXCOORD_0].bufferView].byteLength
      / b[gltf.accessors[meshPrims.attributes.TEXCOORD_0].componentType]
  );

  const mIndicies = new Uint16Array(
    bin,
    gltf.bufferViews[gltf.accessors[meshPrims.indices].bufferView].byteOffset,
    gltf.bufferViews[gltf.accessors[meshPrims.indices].bufferView].byteLength
      / b[gltf.accessors[meshPrims.indices].componentType]
  );

  console.log('vnorms', vNormals);

  // log for analysis
  console.log(data);

  // get buffer to usable data
  /* OLD
  const vNormals = new Float32Array(bin, 564, 432 / 4); // divide by 4, since float 32 is 4 bytes
  const vPositions = new Float32Array(bin, 132, 432 / 4); // divide by 4, since float 32 is 4 bytes
  const vTangents = new Float32Array(bin, 996, 576 / 4);  // divide by1 4, since float 32 is 4 bytes
  const vTextCoords = new Float32Array(bin, 1572, 288 / 4);  // divide by1 4, since float 32 is 4 bytes
  const mIndicies = new Uint16Array(bin, 60, 72 / 2);
  */

  return { vNormals, vPositions, vTangents, vTextCoords, mIndicies };
}

function start(fst, vst, mdl) {
  console.log('starting');
  console.log(mdl);

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

  // enable depth buffer, this renders based on closeness to view
  gl.enable(gl.DEPTH_TEST);

  // enable culler, which removes target faces
  // TEMP|NOTE|OLD: gl.enable(gl.CULL_FACE);

  // tell it which direction is front (gl.CW || gl.CCW)
  // TEMP|OLD gl.frontFace(gl.CCW)

  // removes face to save render time (gl.FRONT || gl.BACK)
  // TEMP|NOTE|OLD: gl.cullFace(gl.BACK); // remove back face

  // create shader namespaces
  const vertexShader = gl.createShader(gl.VERTEX_SHADER)
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

  // set shaders to use, (namespace, sourcecode)
  gl.shaderSource(vertexShader, vst);
  gl.shaderSource(fragmentShader, fst);

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

  // pull vertecies from mdl object
  // TODO const boxVerticies2 = mdl.meshes[0].verticies;

  // pull indices from mdl object
  // TODO const boxIndices2 = mdl.meshes[0].faces.flat();

  // creat buffers
  /* OLD
  const boxVerticies = [ // expects x, y, z, u, v
    -1.0, 1.0, -1.0,   0, 0,
		-1.0, 1.0, 1.0,    0, 1,
		1.0, 1.0, 1.0,     1, 1,
		1.0, 1.0, -1.0,    1, 0,

		// Left
		-1.0, 1.0, 1.0,    0, 0,
		-1.0, -1.0, 1.0,   1, 0,
		-1.0, -1.0, -1.0,  1, 1,
		-1.0, 1.0, -1.0,   0, 1,

		// Right
		1.0, 1.0, 1.0,    1, 1,
		1.0, -1.0, 1.0,   0, 1,
		1.0, -1.0, -1.0,  0, 0,
		1.0, 1.0, -1.0,   1, 0,

		// Front
		1.0, 1.0, 1.0,    1, 1,
		1.0, -1.0, 1.0,    1, 0,
		-1.0, -1.0, 1.0,    0, 0,
		-1.0, 1.0, 1.0,    0, 1,

		// Back
		1.0, 1.0, -1.0,    0, 0,
		1.0, -1.0, -1.0,    0, 1,
		-1.0, -1.0, -1.0,    1, 1,
		-1.0, 1.0, -1.0,    1, 0,

		// Bottom
		-1.0, -1.0, -1.0,   1, 1,
		-1.0, -1.0, 1.0,    1, 0,
		1.0, -1.0, 1.0,     0, 0,
		1.0, -1.0, -1.0,    0, 1,
  ];
  */
  /* NOTE|OLD:
  const boxVerticies = [ // expects x, y, r, g, b
    -1.0, 1.0, -1.0,   0.5, 0.5, 0.5,
		-1.0, 1.0, 1.0,    0.5, 0.5, 0.5,
		1.0, 1.0, 1.0,     0.5, 0.5, 0.5,
		1.0, 1.0, -1.0,    0.5, 0.5, 0.5,

		// Left
		-1.0, 1.0, 1.0,    0.75, 0.25, 0.5,
		-1.0, -1.0, 1.0,   0.75, 0.25, 0.5,
		-1.0, -1.0, -1.0,  0.75, 0.25, 0.5,
		-1.0, 1.0, -1.0,   0.75, 0.25, 0.5,

		// Right
		1.0, 1.0, 1.0,    0.25, 0.25, 0.75,
		1.0, -1.0, 1.0,   0.25, 0.25, 0.75,
		1.0, -1.0, -1.0,  0.25, 0.25, 0.75,
		1.0, 1.0, -1.0,   0.25, 0.25, 0.75,

		// Front
		1.0, 1.0, 1.0,    1.0, 0.0, 0.15,
		1.0, -1.0, 1.0,    1.0, 0.0, 0.15,
		-1.0, -1.0, 1.0,    1.0, 0.0, 0.15,
		-1.0, 1.0, 1.0,    1.0, 0.0, 0.15,

		// Back
		1.0, 1.0, -1.0,    0.0, 1.0, 0.15,
		1.0, -1.0, -1.0,    0.0, 1.0, 0.15,
		-1.0, -1.0, -1.0,    0.0, 1.0, 0.15,
		-1.0, 1.0, -1.0,    0.0, 1.0, 0.15,

		// Bottom
		-1.0, -1.0, -1.0,   0.5, 0.5, 1.0,
		-1.0, -1.0, 1.0,    0.5, 0.5, 1.0,
		1.0, -1.0, 1.0,     0.5, 0.5, 1.0,
		1.0, -1.0, -1.0,    0.5, 0.5, 1.0,
  ];
  */

  /* OLD
  const boxIndices = [
		// Top
		0, 1, 2,
		0, 2, 3,

		// Left
		5, 4, 6,
		6, 4, 7,

		// Right
		8, 9, 10,
		8, 10, 11,

		// Front
		13, 12, 14,
		15, 14, 12,

		// Back
		16, 17, 18,
		16, 18, 19,

		// Bottom
		21, 20, 22,
		22, 20, 23,
  ];
  */

  // create vertex buffer object on gpu
  const boxVertexBufferObject = gl.createBuffer();

  // bind the cpu buffer to gpu buffer (buffertype, bufferobject)
  gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexBufferObject);

  // bind the array to the buffer (buffertype, buffer as typed buffer, render variance)
  // OLD gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxVerticies), gl.STATIC_DRAW);
  gl.bufferData(gl.ARRAY_BUFFER, mdl.vPositions, gl.STATIC_DRAW);

  // create index buffer object on gpu
  var boxIndexBufferObject = gl.createBuffer();

  // bind the cpu buffer to the gpu buffer (buffertype, bufferobject)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boxIndexBufferObject);

  // bind the array to the buffer (buffertype, buffer as typed buffer, render variance)
  // OLD gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(boxIndices), gl.STATIC_DRAW);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mdl.mIndicies, gl.STATIC_DRAW);

  // gets attribute from gl program (program => vert, namespace)
  const positionAttribLocation = gl.getAttribLocation(program, 'vertPosition'); // position
  // NOTE|OLD: const colorAttribLocation = gl.getAttribLocation(program, 'vertColor'); // color
  const texCoordAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');

  gl.vertexAttribPointer(
    positionAttribLocation,
    3,
    gl.FLOAT,
    gl.FALSE,
    3 * Float32Array.BYTES_PER_ELEMENT,
    0,
  );
  /* OLD
  // run position
  gl.vertexAttribPointer(
    positionAttribLocation, // attribute location
    3, // number of elements per attribute
    gl.FLOAT, // type of the elements
    gl.FALSE, // data normalized
    5 * Float32Array.BYTES_PER_ELEMENT, // size of an individual vertex
    0, // offset from the beginning of a single vertex to this attribute
  );

  // run color | texture
  gl.vertexAttribPointer(
    texCoordAttribLocation,
    // NOTE|OLD: colorAttribLocation, // attribute location
    2, // number of elements per attribute
    gl.FLOAT, // type of the elements
    gl.FALSE, // data normalized
    5 * Float32Array.BYTES_PER_ELEMENT, // size of an individual vertex
    3 * Float32Array.BYTES_PER_ELEMENT, // offset from the beginning of a single vertex to this attribute
  );
  */

  // enable
  gl.enableVertexAttribArray(positionAttribLocation);
  // gl.enableVertexAttribArray(texCoordAttribLocation);

  // create texture
  const boxTexture = gl.createTexture();

  // bind texture(type, texture);
  gl.bindTexture(gl.TEXTURE_2D, boxTexture);

  // allow alpha
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // filter image(const type, Coord, format)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // set samping(const type, filter, filter type)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // set texture
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    document.getElementById('crate-texture'),
  );

  // unbind after use
  gl.bindTexture(gl.TEXTURE_2D, null);

  // reverses texture read from bottle left to top left
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // get uniforms [ constants ]
  const matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
  const matViewUniformLocation = gl.getUniformLocation(program, 'mView');
  const matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

  // set program to use
  gl.useProgram(program);

  // create cpu matrix data
  const worldMatrix = new Float32Array(16);
  const viewMatrix = new Float32Array(16);
  const projMatrix = new Float32Array(16);

  // set to identity
  glMatrix.mat4.identity(worldMatrix); // unchanged, sets to identity
  glMatrix.mat4.lookAt(viewMatrix, [0, 0, -0.5], [0, 0, 0], [0, 1, 0]); // view matrix (out: mat4, eye: vec3, center: vec3, up: vec3)
  glMatrix.mat4.perspective(projMatrix, glMatrix.glMatrix.toRadian(45), canvas.width / canvas.height, 0.1, 1000); // sets to perspective (out: mat4, fov: number, aspect: number, near: number, far: number)

  // send to shader gl[`uniform${type}${size}v`](gpu data, transpose?, cpu data)
  gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
  gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
  gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

  // main renderer

  const xRotationMatrix = new Float32Array(16);
  const yRotationMatrix = new Float32Array(16);

  // generate base matrix
  let identityMatrix = new Float32Array(16);
  glMatrix.mat4.identity(identityMatrix);

  // create angle namespace outside of loop
  let angle;

  function loop() {
    // get rotation time, one full rotation every 6 seconds that passes
    angle = performance.now() / 1000 / 6 * 2 * Math.PI;

    // NOTE|OLD: rotate matrix (output: mat4, originalMatrix: mat4, angleToRotate: number, axis: vec3)
    // NOTE|OLD: glMatrix.mat4.rotate(worldMatrix, identityMatrix, angle, [0, 1, 0]);
    
    // rotate around y matrix first
    glMatrix.mat4.rotate(yRotationMatrix, identityMatrix, angle, [0, 1, 0]);

    // rotate around x matrix second
    glMatrix.mat4.rotate(xRotationMatrix, identityMatrix, angle / 2, [1, 0, 0]);

    // multiply together to form world transform
    glMatrix.mat4.mul(worldMatrix, xRotationMatrix, yRotationMatrix);

    // update world matrix
    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);

    // clear screen
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

    // bind texture values
    gl.bindTexture(gl.TEXTURE_2D, boxTexture);
    gl.activeTexture(gl.TEXTURE0);

    // NOTE|OLD: draw the bound buffer (type you are drawing, skip, count)
    // NOTE|OLD: gl.drawArrays(gl.TRIANGLES, 0, 3);
    // draw the bound buffer and incidies (type you are drawing, count, type of variable, skip)
    // OLD: pre-import model : gl.drawElements(gl.TRIANGLES, boxIndices.length, gl.UNSIGNED_SHORT, 0);
    gl.drawElements(gl.TRIANGLES, mdl.mIndicies.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(loop);
  }

  // call when screen is ready to draw, does not call when out of focus
  requestAnimationFrame(loop);
}