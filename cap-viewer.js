const showViewerMessage = (text) => {
  const stage = document.getElementById('cap-stage');
  const message = document.createElement('p');
  message.className = 'viewer-message';
  message.setAttribute('role', 'status');
  message.textContent = text;
  stage.appendChild(message);
};

const THREE = window.THREE;

if (!THREE) {
  showViewerMessage('The 3D library could not load. Check your internet connection and reload.');
} else {
  try {
  const canvas = document.getElementById('cap-viewer');
  const stage = document.getElementById('cap-stage');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 2, 4.8);
  camera.lookAt(0, 0.55, 0.35);

  scene.add(new THREE.HemisphereLight(0xf4f4e9, 0x64766f, 2.1));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-3, 5, 4);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xe3f2ed, 1.4);
  fillLight.position.set(4, 2, -3);
  scene.add(fillLight);

  const cap = new THREE.Group();
  scene.add(cap);
  const crownAssembly = new THREE.Group();
  cap.add(crownAssembly);
  const weaveCanvas = document.createElement('canvas');
  weaveCanvas.width = 128;
  weaveCanvas.height = 128;
  const weaveContext = weaveCanvas.getContext('2d');
  weaveContext.fillStyle = '#d7d9d2';
  weaveContext.fillRect(0, 0, 128, 128);
  for (let thread = 0; thread < 128; thread += 4) {
    weaveContext.fillStyle = 'rgba(255,255,255,0.22)';
    weaveContext.fillRect(thread, 0, 1, 128);
    weaveContext.fillRect(0, thread, 128, 1);
    weaveContext.fillStyle = 'rgba(25,35,33,0.13)';
    weaveContext.fillRect(thread + 2, 0, 1, 128);
    weaveContext.fillRect(0, thread + 2, 128, 1);
  }
  const weaveTexture = new THREE.CanvasTexture(weaveCanvas);
  weaveTexture.wrapS = THREE.RepeatWrapping;
  weaveTexture.wrapT = THREE.RepeatWrapping;
  weaveTexture.repeat.set(8, 5);
  weaveTexture.colorSpace = THREE.SRGBColorSpace;
  const fabric = new THREE.MeshStandardMaterial({
    color: '#193957',
    map: weaveTexture,
    roughness: 0.86,
    metalness: 0
  });

  const profile = [
    [0.1, 1.02, 0.78],
    [0.2, 1.06, 0.82],
    [0.38, 1.04, 0.81],
    [0.58, 1, 0.78],
    [0.78, 0.87, 0.68],
    [0.96, 0.68, 0.54],
    [1.08, 0.4, 0.34],
    [1.12, 0.08, 0.08],
    [1.12, 0.015, 0.015]
  ];

  const smoothProfile = [];
  for (let section = 0; section < profile.length - 1; section += 1) {
    for (let step = 0; step < 8; step += 1) {
      const progress = step / 8;
      smoothProfile.push(profile[section].map((value, axis) => value + (profile[section + 1][axis] - value) * progress));
    }
  }
  smoothProfile.push(profile.at(-1));

  const crownVertices = [];
  const crownUvs = [];
  const crownIndices = [];
  const radialSegments = 64;
  smoothProfile.forEach(([height, radiusX, radiusZ], ring) => {
    for (let segment = 0; segment <= radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      crownVertices.push(radiusX * Math.cos(angle), height, radiusZ * Math.sin(angle));
      crownUvs.push(segment / radialSegments, ring / (smoothProfile.length - 1));
      if (ring < smoothProfile.length - 1 && segment < radialSegments) {
        const current = ring * (radialSegments + 1) + segment;
        const next = current + radialSegments + 1;
        const middleAngle = ((segment + 0.5) / radialSegments) * Math.PI * 2;
        const middleHeight = (smoothProfile[ring][0] + smoothProfile[ring + 1][0]) / 2;
        const rearCutout = Math.sin(middleAngle) < -0.72 && middleHeight < 0.5;
        if (!rearCutout) crownIndices.push(current, next, current + 1, current + 1, next, next + 1);
      }
    }
  });

  const crownGeometry = new THREE.BufferGeometry();
  crownGeometry.setAttribute('position', new THREE.Float32BufferAttribute(crownVertices, 3));
  crownGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(crownUvs, 2));
  crownGeometry.setIndex(crownIndices);
  crownGeometry.computeVertexNormals();
  const crown = new THREE.Mesh(crownGeometry, fabric);
  crown.castShadow = true;
  crown.receiveShadow = true;
  crownAssembly.add(crown);

  let brimShape = 'curve';
  const brimEdgeFactor = (across) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(across), 4)), 1 / 4);
  const brimHeight = (across, depth, shape = brimShape) => {
    const base = 0.12 + 0.06 * across * across;
    return shape === 'curve'
      ? base - 0.12 * depth * depth + 0.14 * Math.abs(across) * depth
      : base - 0.012 * depth * depth;
  };
  const brimVertices = [];
  const brimUvs = [];
  const brimIndices = [];
  const brimRows = 16;
  const brimColumns = 48;
  for (let row = 0; row <= brimRows; row += 1) {
    const depth = row / brimRows;
    for (let column = 0; column <= brimColumns; column += 1) {
      const across = (column / brimColumns) * 2 - 1;
      const edge = brimEdgeFactor(across);
      const x = across * 1.28;
      const back = 0.14 * edge;
      const front = 1.92 * edge;
      const z = back + (front - back) * depth;
      const y = brimHeight(across, depth);
      brimVertices.push(x, y, z);
      brimUvs.push(column / brimColumns, row / brimRows);
      if (row < brimRows && column < brimColumns) {
        const current = row * (brimColumns + 1) + column;
        const nextRow = current + brimColumns + 1;
        brimIndices.push(current, current + 1, nextRow, current + 1, nextRow + 1, nextRow);
      }
    }
  }

  const brimGeometry = new THREE.BufferGeometry();
  brimGeometry.setAttribute('position', new THREE.Float32BufferAttribute(brimVertices, 3));
  brimGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(brimUvs, 2));
  brimGeometry.setIndex(brimIndices);
  brimGeometry.computeVertexNormals();
  const brim = new THREE.Mesh(brimGeometry, fabric);
  brim.material = fabric.clone();
  brim.material.side = THREE.DoubleSide;
  brim.castShadow = true;
  brim.receiveShadow = true;
  cap.add(brim);

  const underBrimMaterial = fabric.clone();
  underBrimMaterial.color.set('#c85c3d');
  underBrimMaterial.side = THREE.DoubleSide;
  const underBrim = new THREE.Mesh(brimGeometry, underBrimMaterial);
  underBrim.position.y = -0.025;
  underBrim.visible = false;
  cap.add(underBrim);

  const seamMaterial = new THREE.LineBasicMaterial({ color: 0xb4c5b6, transparent: true, opacity: 0.56 });
  const threadMaterial = new THREE.MeshStandardMaterial({ color: '#bdcbbd', roughness: 0.85 });
  for (let panel = 0; panel < 6; panel += 1) {
    const angle = (panel / 6) * Math.PI * 2;
    if (Math.sin(angle) < -0.72) continue;
    const seamPoints = smoothProfile.map(([height, radiusX, radiusZ]) => new THREE.Vector3(
      (radiusX + 0.004) * Math.cos(angle),
      height + 0.003,
      (radiusZ + 0.004) * Math.sin(angle)
    ));
    crownAssembly.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(seamPoints), seamMaterial));
  }

  const button = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 20, 12),
    new THREE.MeshStandardMaterial({ color: '#b6c7b5', roughness: 0.7 })
  );
  button.position.y = 1.15;
  crownAssembly.add(button);

  const sweatbandMaterial = new THREE.MeshStandardMaterial({ color: '#101b22', roughness: 0.96 });
  const sweatband = new THREE.Mesh(
    new THREE.TorusGeometry(0.94, 0.045, 10, 64),
    sweatbandMaterial
  );
  sweatband.rotation.x = Math.PI / 2;
  sweatband.scale.set(1, 0.76, 1);
  sweatband.position.y = 0.12;
  crownAssembly.add(sweatband);

  const snapVertices = [];
  const snapIndices = [];
  const snapSteps = 32;
  for (let step = 0; step <= snapSteps; step += 1) {
    const x = -0.62 + (step / snapSteps) * 1.24;
    const z = -0.82 * Math.sqrt(Math.max(0, 1 - (x / 1.06) ** 2)) - 0.025;
    snapVertices.push(x, 0.23, z, x, 0.33, z);
    if (step < snapSteps) {
      const current = step * 2;
      snapIndices.push(current, current + 2, current + 1, current + 1, current + 2, current + 3);
    }
  }
  const snapGeometry = new THREE.BufferGeometry();
  snapGeometry.setAttribute('position', new THREE.Float32BufferAttribute(snapVertices, 3));
  snapGeometry.setIndex(snapIndices);
  snapGeometry.computeVertexNormals();
  const snapStrap = new THREE.Mesh(snapGeometry, new THREE.MeshStandardMaterial({
    color: '#242a2d',
    roughness: 0.72,
    side: THREE.DoubleSide
  }));
  crownAssembly.add(snapStrap);

  const snapHoleMaterial = new THREE.MeshBasicMaterial({ color: '#101b22', side: THREE.DoubleSide });
  for (let hole = 0; hole < 5; hole += 1) {
    const x = (hole - 2) * 0.18;
    const z = -0.82 * Math.sqrt(Math.max(0, 1 - (x / 1.06) ** 2)) - 0.029;
    const snapHole = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), snapHoleMaterial);
    snapHole.position.set(x, 0.28, z);
    snapHole.rotation.y = Math.PI;
    crownAssembly.add(snapHole);
  }

  const eyeletRingMaterial = new THREE.MeshStandardMaterial({ color: '#bac7ba', metalness: 0.52, roughness: 0.38 });
  const eyeletInsetMaterial = new THREE.MeshBasicMaterial({ color: '#142b3a' });
  for (let vent = 0; vent < 6; vent += 1) {
    const angle = (vent / 6) * Math.PI * 2;
    const x = 0.86 * Math.cos(angle);
    const z = 0.67 * Math.sin(angle);
    const normalX = Math.cos(angle) / 0.87;
    const normalZ = Math.sin(angle) / 0.68;
    const normalLength = Math.hypot(normalX, normalZ);
    const eyelet = new THREE.Group();
    eyelet.position.set(x + (normalX / normalLength) * 0.008, 0.78, z + (normalZ / normalLength) * 0.008);
    eyelet.rotation.y = Math.atan2(normalX, normalZ);
    eyelet.add(new THREE.Mesh(new THREE.CircleGeometry(0.019, 20), eyeletInsetMaterial));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.006, 8, 20), eyeletRingMaterial);
    ring.position.z = 0.003;
    eyelet.add(ring);
    crownAssembly.add(eyelet);
  }

  const backDetails = new THREE.Group();
  crownAssembly.add(backDetails);
  const meshPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.25),
    new THREE.MeshStandardMaterial({ color: '#89998c', map: weaveTexture, roughness: 1, side: THREE.DoubleSide })
  );
  meshPanel.position.set(0, 0.64, -0.77);
  meshPanel.rotation.y = Math.PI;
  meshPanel.visible = false;
  backDetails.add(meshPanel);

  const embroideryCanvas = document.createElement('canvas');
  embroideryCanvas.width = 256;
  embroideryCanvas.height = 128;
  const embroideryContext = embroideryCanvas.getContext('2d');
  embroideryContext.font = 'bold 76px sans-serif';
  embroideryContext.textAlign = 'center';
  embroideryContext.textBaseline = 'middle';
  embroideryContext.fillStyle = '#e5cf9d';
  embroideryContext.fillText('CC', 128, 66);
  const embroideryTexture = new THREE.CanvasTexture(embroideryCanvas);
  embroideryTexture.colorSpace = THREE.SRGBColorSpace;
  const embroideryPatch = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.17),
    new THREE.MeshBasicMaterial({ map: embroideryTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false })
  );
  embroideryPatch.position.set(0, 0.65, -0.785);
  embroideryPatch.rotation.y = Math.PI;
  embroideryPatch.visible = false;
  backDetails.add(embroideryPatch);

  const makeStitchGeometry = (depth) => {
    const stitchPoints = [];
    for (let point = 0; point <= 64; point += 1) {
      const across = (point / 64) * 2 - 1;
      const edge = brimEdgeFactor(across);
      stitchPoints.push(new THREE.Vector3(
        across * 1.28,
        brimHeight(across, depth) + 0.008,
        (0.14 + (1.92 - 0.14) * depth) * edge
      ));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stitchPoints), 96, 0.009, 5, false);
  };
  const stitches = new THREE.Mesh(makeStitchGeometry(0.76), threadMaterial);
  cap.add(stitches);
  const secondStitches = new THREE.Mesh(makeStitchGeometry(0.68), threadMaterial);
  secondStitches.visible = false;
  cap.add(secondStitches);

  const edgeThreadMaterial = new THREE.MeshStandardMaterial({ color: '#f0c879', roughness: 0.76 });
  const makeBrimEdgeGeometry = () => {
    const brimEdgePoints = [];
    for (let column = 0; column <= brimColumns; column += 1) {
      const vertex = (brimRows * (brimColumns + 1) + column) * 3;
      brimEdgePoints.push(new THREE.Vector3(
        brimVertices[vertex],
        brimVertices[vertex + 1] - 0.008,
        brimVertices[vertex + 2]
      ));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(brimEdgePoints), 96, 0.018, 6, false);
  };
  const brimEdge = new THREE.Mesh(
    makeBrimEdgeGeometry(),
    fabric
  );
  cap.add(brimEdge);

  const groundShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.28, 48),
    new THREE.MeshBasicMaterial({ color: 0x53665f, transparent: true, opacity: 0.15, depthWrite: false })
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.set(0, -0.025, 0.45);
  groundShadow.scale.set(1, 0.5, 1);
  scene.add(groundShadow);

  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.36),
    new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false })
  );
  logo.position.set(0, 0.63, 0.76);
  logo.visible = false;
  crownAssembly.add(logo);

  const resize = () => {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  const [visorSelect, stitchSelect, brimSelect, sweatbandSelect, crownSelect, backPanelSelect] =
    document.querySelectorAll('.interactive-card .custom-text');
  let lastShapeControl = 'visor';

  const rebuildBrim = () => {
    const position = brimGeometry.getAttribute('position');
    for (let row = 0; row <= brimRows; row += 1) {
      const depth = row / brimRows;
      for (let column = 0; column <= brimColumns; column += 1) {
        const across = (column / brimColumns) * 2 - 1;
        const vertex = (row * (brimColumns + 1) + column) * 3;
        const y = brimHeight(across, depth);
        brimVertices[vertex + 1] = y;
        position.setY(vertex / 3, y);
      }
    }
    position.needsUpdate = true;
    brimGeometry.computeVertexNormals();
    stitches.geometry.dispose();
    stitches.geometry = makeStitchGeometry(0.76);
    secondStitches.geometry.dispose();
    secondStitches.geometry = makeStitchGeometry(0.68);
    brimEdge.geometry.dispose();
    brimEdge.geometry = makeBrimEdgeGeometry();
  };

  const updateBrimStyle = () => {
    const selectedShape = lastShapeControl === 'visor' ? visorSelect.value : brimSelect.value;
    if (selectedShape === 'Classic curve' || selectedShape === 'Soft curve') brimShape = 'curve';
    if (selectedShape === 'Flat visor' || selectedShape === 'Flat brim' || selectedShape === 'Contrast edge') brimShape = 'flat';
    rebuildBrim();
    brimEdge.material = visorSelect.value === 'Contrast edge' ? edgeThreadMaterial : fabric;
    underBrim.visible = brimSelect.value === 'Contrast underbrim';
  };

  visorSelect.addEventListener('change', () => {
    lastShapeControl = 'visor';
    updateBrimStyle();
  });
  brimSelect.addEventListener('change', () => {
    lastShapeControl = 'brim';
    updateBrimStyle();
  });
  stitchSelect.addEventListener('change', () => {
    const style = stitchSelect.value;
    secondStitches.visible = style === 'Double-row stitching';
    threadMaterial.color.set(style === 'Tone-on-tone thread' ? fabric.color : '#e8c994');
  });
  sweatbandSelect.addEventListener('change', () => {
    const bandColors = {
      'Cotton twill': '#c5b79e',
      'Moisture-wicking mesh': '#759282',
      'Padded comfort band': '#35434c'
    };
    sweatbandMaterial.color.set(bandColors[sweatbandSelect.value]);
  });
  crownSelect.addEventListener('change', () => {
    const crownHeights = { 'High crown': 1.14, 'Mid crown': 1, 'Relaxed crown': 0.86 };
    crownAssembly.scale.y = crownHeights[crownSelect.value];
  });
  backPanelSelect.addEventListener('change', () => {
    meshPanel.visible = backPanelSelect.value === 'Ventilated mesh';
    embroideryPatch.visible = backPanelSelect.value === 'Embroidered detail';
  });

  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      fabric.color.set(swatch.dataset.color);
      brim.material.color.set(swatch.dataset.color);
      if (stitchSelect.value === 'Tone-on-tone thread') threadMaterial.color.copy(fabric.color);
      document.getElementById('color-name').textContent = swatch.dataset.name;
      swatches.forEach((item) => {
        const isSelected = item === swatch;
        item.classList.toggle('is-active', isSelected);
        item.setAttribute('aria-pressed', String(isSelected));
      });
    });
  });

  document.getElementById('picture-upload').addEventListener('change', (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    new THREE.TextureLoader().load(imageUrl, (texture) => {
      URL.revokeObjectURL(imageUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      logo.material.map?.dispose();
      logo.material.map = texture;
      logo.material.needsUpdate = true;
      logo.visible = true;
      document.getElementById('upload-label').textContent = file.name;
    }, undefined, () => {
      URL.revokeObjectURL(imageUrl);
    });
  });

  document.querySelectorAll('[data-view]').forEach((buttonControl) => {
    buttonControl.addEventListener('click', () => {
      const view = buttonControl.dataset.view;
      if (view === 'front') cap.rotation.y = 0;
      if (view === 'side') cap.rotation.y = Math.PI / 2;
      if (view === 'reset') {
        cap.rotation.set(0, 0.32, 0);
        camera.position.set(0, 2, 4.8);
      }
      camera.lookAt(0, 0.55, 0.35);
    });
  });

  const autoRotate = document.getElementById('auto-rotate');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) autoRotate.checked = false;

  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    previousX = event.clientX;
    previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    cap.rotation.y += (event.clientX - previousX) * 0.009;
    cap.rotation.x = THREE.MathUtils.clamp(cap.rotation.x + (event.clientY - previousY) * 0.006, -0.22, 0.28);
    previousX = event.clientX;
    previousY = event.clientY;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    camera.position.z = THREE.MathUtils.clamp(camera.position.z + event.deltaY * 0.003, 3.4, 7.2);
    camera.lookAt(0, 0.55, 0.35);
  }, { passive: false });

  const render = () => {
    if (autoRotate.checked && !dragging) cap.rotation.y += 0.002;
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  render();
  } catch (error) {
    console.error('Could not start the 3D cap preview:', error);
    showViewerMessage('The 3D preview could not start. Check that WebGL is enabled in your browser.');
  }
}