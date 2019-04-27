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

    const data = {
      textures: [],
    };

    loadResource('shaders/fs.glsl', 'text')
      .then((r) => {
        fst = r;
        return loadResource('shaders/vs.glsl', 'text');
      })
      .then((r) => {
        vst = r;
        return loadResource('models/Lantern.gltf', 'json');
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
        return Promise.all(r.map(
          i => {
            return new Promise((resolve) => {
              const image = new Image();
              image.onload = () => { resolve(image); }
              image.src = URL.createObjectURL(i);
            })
          }
        ));
      })
      .then((r) => {
        data.images = r;

        const d = dataCheck(data);
        this.start(fst, vst, d);

        resolve();
      })
  });
}

function dataCheck(data) {
  console.log(data);

  // destructure
  const { gltf, bin, images } = data;

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

  /* NOTE some models don't need this
  const vTangents = new Float32Array(
    bin,
    gltf.bufferViews[gltf.accessors[meshPrims.attributes.TANGENT].bufferView].byteOffset,
    gltf.bufferViews[gltf.accessors[meshPrims.attributes.TANGENT].bufferView].byteLength
      / b[gltf.accessors[meshPrims.attributes.TANGENT].componentType]
  );
  */

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

  return { vNormals, vPositions, vTextCoords, mIndicies, images };
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

  // get gpu data
  const attLocPositions = gl.getAttribLocation(program, 'vertPosition');
  const attLocTextCoords = gl.getAttribLocation(program, 'vertTexCoord');

  const indicesBuffer = gl.createBuffer(); // create buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mdl.mIndicies, gl.STATIC_DRAW);

  const positionsBuffer = gl.createBuffer(); // create buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer); // bind the buffer
  gl.bufferData(gl.ARRAY_BUFFER, mdl.vPositions, gl.STATIC_DRAW); // set buffer data

  gl.vertexAttribPointer( // give buffer specs
    attLocPositions,
    3,
    gl.FLOAT,
    gl.FALSE,
    3 * Float32Array.BYTES_PER_ELEMENT,
    0,
  );

  const TextCoordsBuffer = gl.createBuffer(); // create buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, TextCoordsBuffer); // bind the buffer
  gl.bufferData(gl.ARRAY_BUFFER, mdl.vTextCoords, gl.STATIC_DRAW); // set buffer data

  gl.vertexAttribPointer( // give buffer specs
    attLocTextCoords,
    2,
    gl.FLOAT,
    gl.FALSE,
    2 * Float32Array.BYTES_PER_ELEMENT,
    0,
  );

  // enable buffers
  gl.enableVertexAttribArray(attLocPositions);
  gl.enableVertexAttribArray(attLocTextCoords);

  const texture = gl.createTexture(); // create texture
  gl.bindTexture(gl.TEXTURE_2D, texture); // bind texture type

  gl.enable(gl.BLEND); // enable blending
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // basic blend function

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
    mdl.images[0],
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
  glMatrix.mat4.lookAt(viewMatrix, [0, 0, -50], [0, 0, 0], [0, 1, 0]); // view matrix (out: mat4, eye: vec3, center: vec3, up: vec3)
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
    gl.bindTexture(gl.TEXTURE_2D, texture);
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