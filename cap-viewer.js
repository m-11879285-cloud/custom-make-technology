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
  camera.position.set(1.25, 2.05, 4.9);
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
  crownAssembly.scale.set(0.9, 1, 1.2);
  cap.add(crownAssembly);
  const weaveCanvas = document.createElement('canvas');
  weaveCanvas.width = 256;
  weaveCanvas.height = 256;
  const weaveContext = weaveCanvas.getContext('2d');
  weaveContext.fillStyle = '#f8f8f7';
  weaveContext.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 256; row += 4) {
    const offset = (row / 4) % 8;
    for (let column = 0; column < 256; column += 8) {
      weaveContext.fillStyle = ((row / 4 + column / 8) % 2 === 0)
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(25,35,33,0.045)';
      weaveContext.fillRect((column + offset) % 256, row, 3, 4);
    }
  }
  const weaveTexture = new THREE.CanvasTexture(weaveCanvas);
  weaveTexture.wrapS = THREE.RepeatWrapping;
  weaveTexture.wrapT = THREE.RepeatWrapping;
  weaveTexture.repeat.set(8, 5);
  weaveTexture.colorSpace = THREE.SRGBColorSpace;
  const fabric = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: weaveTexture,
    bumpMap: weaveTexture,
    bumpScale: 0.006,
    roughness: 0.86,
    metalness: 0
  });

  const profile = [
    [0.1, 1.02, 0.78],
    [0.18, 1.06, 0.82],
    [0.48, 1.055, 0.815],
    [0.72, 1.015, 0.79],
    [0.9, 0.88, 0.7],
    [1.05, 0.62, 0.5],
    [1.16, 0.3, 0.24],
    [1.2, 0.12, 0.1],
    [1.2, 0.015, 0.015]
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
  const radialSegments = 96;
  smoothProfile.forEach(([height, radiusX, radiusZ], ring) => {
    for (let segment = 0; segment <= radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const seamRelief = Math.pow(Math.max(0, Math.cos((angle - Math.PI / 2) * 3)), 6);
      const panelScale = 1 - seamRelief * 0.016;
      crownVertices.push(radiusX * panelScale * Math.cos(angle), height, radiusZ * panelScale * Math.sin(angle));
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
  const brimWidth = 1.02;
  const brimFront = 1.58;
  const brimEdgeFactor = (across) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(across), 4)), 1 / 4);
  const brimHeight = (across, depth, shape = brimShape) => {
    const sideCurve = across * across;
    const base = 0.12 + 0.025 * sideCurve;
    const frontCurve = depth * depth;
    return shape === 'curve'
      ? 0.12 + 0.1 * frontCurve - 0.16 * sideCurve * frontCurve
      : base - 0.004 * frontCurve;
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
      const x = across * brimWidth;
      const back = 0.14 * edge;
      const front = brimFront * edge;
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
  const visorMaterial = fabric.clone();
  visorMaterial.side = THREE.DoubleSide;
  const brim = new THREE.Mesh(brimGeometry, visorMaterial);
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

  const threadMaterial = new THREE.MeshStandardMaterial({ color: '#aab6bb', roughness: 0.9 });
  for (let panel = 0; panel < 6; panel += 1) {
    const angle = Math.PI / 2 + (panel / 6) * Math.PI * 2;
    if (Math.sin(angle) < -0.72) continue;
    const seamPoints = smoothProfile.map(([height, radiusX, radiusZ]) => new THREE.Vector3(
      (radiusX * (1 - 0.016) + 0.009) * Math.cos(angle),
      height + 0.003,
      (radiusZ * (1 - 0.016) + 0.009) * Math.sin(angle)
    ));
    crownAssembly.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPoints), 96, 0.007, 6, false),
      threadMaterial
    ));
  }

  const crownBasePoints = Array.from({ length: 97 }, (_, segment) => {
    const angle = (segment / 96) * Math.PI * 2;
    return new THREE.Vector3(1.045 * Math.cos(angle), 0.16, 0.805 * Math.sin(angle));
  });
  crownAssembly.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crownBasePoints, true), 96, 0.008, 6, false),
    threadMaterial
  ));

  const buttonMaterial = new THREE.MeshStandardMaterial({ color: '#f1f2f2', roughness: 0.78 });
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 12), buttonMaterial);
  button.position.y = 1.25;
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
  const snapStrapMaterial = fabric.clone();
  snapStrapMaterial.side = THREE.DoubleSide;
  const snapStrap = new THREE.Mesh(snapGeometry, snapStrapMaterial);
  crownAssembly.add(snapStrap);

  const snapHoleMaterial = new THREE.MeshBasicMaterial({ color: '#929698', side: THREE.DoubleSide });
  for (let hole = 0; hole < 5; hole += 1) {
    const x = (hole - 2) * 0.18;
    const z = -0.82 * Math.sqrt(Math.max(0, 1 - (x / 1.06) ** 2)) - 0.029;
    const snapHole = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), snapHoleMaterial);
    snapHole.position.set(x, 0.28, z);
    snapHole.rotation.y = Math.PI;
    crownAssembly.add(snapHole);
  }

  const eyeletRingMaterial = new THREE.MeshStandardMaterial({ color: '#e1e2e2', metalness: 0.12, roughness: 0.72 });
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
        across * brimWidth,
        brimHeight(across, depth) + 0.008,
        (0.14 + (brimFront - 0.14) * depth) * edge
      ));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stitchPoints), 96, 0.005, 5, false);
  };
  const stitchDepths = [0.5, 0.58, 0.66, 0.74, 0.82];
  const stitches = stitchDepths.map((depth) => new THREE.Mesh(makeStitchGeometry(depth), threadMaterial));
  stitches.forEach((stitch) => cap.add(stitch));
  const secondStitches = new THREE.Mesh(makeStitchGeometry(0.9), threadMaterial);
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

  const logoColumns = 24;
  const logoRows = 16;
  const logoVertices = [];
  const logoUvs = [];
  const logoIndices = [];
  for (let row = 0; row <= logoRows; row += 1) {
    const y = 0.47 + (row / logoRows) * 0.36;
    let profileIndex = smoothProfile.findIndex(([height]) => height >= y);
    profileIndex = Math.max(1, profileIndex);
    const lowerProfile = smoothProfile[profileIndex - 1];
    const upperProfile = smoothProfile[profileIndex];
    const progress = (y - lowerProfile[0]) / (upperProfile[0] - lowerProfile[0]);
    const radiusX = lowerProfile[1] + (upperProfile[1] - lowerProfile[1]) * progress;
    const radiusZ = lowerProfile[2] + (upperProfile[2] - lowerProfile[2]) * progress;
    for (let column = 0; column <= logoColumns; column += 1) {
      const u = column / logoColumns;
      const x = (u * 2 - 1) * 0.32;
      const z = radiusZ * Math.sqrt(1 - (x / radiusX) ** 2) + 0.012;
      logoVertices.push(x, y, z);
      logoUvs.push(u, row / logoRows);
      if (row < logoRows && column < logoColumns) {
        const current = row * (logoColumns + 1) + column;
        const nextRow = current + logoColumns + 1;
        logoIndices.push(current, current + 1, nextRow, current + 1, nextRow + 1, nextRow);
      }
    }
  }
  const logoGeometry = new THREE.BufferGeometry();
  logoGeometry.setAttribute('position', new THREE.Float32BufferAttribute(logoVertices, 3));
  logoGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(logoUvs, 2));
  logoGeometry.setIndex(logoIndices);
  logoGeometry.computeVertexNormals();
  const logo = new THREE.Mesh(
    logoGeometry,
    new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.9, side: THREE.FrontSide })
  );
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
    stitches.forEach((stitch, index) => {
      stitch.geometry.dispose();
      stitch.geometry = makeStitchGeometry(stitchDepths[index]);
    });
    secondStitches.geometry.dispose();
    secondStitches.geometry = makeStitchGeometry(0.9);
    brimEdge.geometry.dispose();
    brimEdge.geometry = makeBrimEdgeGeometry();
  };

  const updateBrimStyle = () => {
    const selectedShape = lastShapeControl === 'visor' ? visorSelect.value : brimSelect.value;
    if (selectedShape === 'Classic curve' || selectedShape === 'Soft curve') brimShape = 'curve';
    if (selectedShape === 'Flat visor' || selectedShape === 'Flat brim' || selectedShape === 'Contrast edge') brimShape = 'flat';
    rebuildBrim();
    brimEdge.material = visorSelect.value === 'Contrast edge' ? edgeThreadMaterial : visorMaterial;
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

  let visorColorCustomized = false;
  const colorPickers = document.querySelectorAll('.color-picker');
  colorPickers.forEach((picker) => {
    const isVisorPicker = picker.dataset.colorTarget === 'visor';
    const swatches = picker.querySelectorAll('.color-swatch');
    swatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        if (isVisorPicker) {
          visorColorCustomized = true;
          visorMaterial.color.set(swatch.dataset.color);
          if (visorSelect.value !== 'Contrast edge') brimEdge.material = visorMaterial;
        } else {
          fabric.color.set(swatch.dataset.color);
          if (!visorColorCustomized) visorMaterial.color.set(swatch.dataset.color);
          buttonMaterial.color.set(swatch.dataset.color);
          snapStrapMaterial.color.set(swatch.dataset.color);
          if (stitchSelect.value === 'Tone-on-tone thread') threadMaterial.color.copy(fabric.color);
        }
        picker.querySelector('.color-name').textContent = swatch.dataset.name;
        swatches.forEach((item) => {
          const isSelected = item === swatch;
          item.classList.toggle('is-active', isSelected);
          item.setAttribute('aria-pressed', String(isSelected));
        });
      });
    });
  });

  const pictureUpload = document.getElementById('picture-upload');
  const uploadLabel = document.getElementById('upload-label');
  const removePictureButton = document.getElementById('remove-picture');

  pictureUpload.addEventListener('change', (event) => {
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
      uploadLabel.textContent = file.name;
      removePictureButton.disabled = false;
    }, undefined, () => {
      URL.revokeObjectURL(imageUrl);
    });
  });

  removePictureButton.addEventListener('click', () => {
    logo.visible = false;
    logo.material.map?.dispose();
    logo.material.map = null;
    logo.material.needsUpdate = true;
    pictureUpload.value = '';
    uploadLabel.textContent = 'Add an image';
    removePictureButton.disabled = true;
  });

  document.querySelectorAll('[data-view]').forEach((buttonControl) => {
    buttonControl.addEventListener('click', () => {
      const view = buttonControl.dataset.view;
      if (view === 'front') {
        cap.rotation.y = 0;
        camera.position.set(0, 2.05, 4.9);
      }
      if (view === 'side') {
        cap.rotation.y = Math.PI / 2;
        camera.position.set(0, 2.05, 4.9);
      }
      if (view === 'reset') {
        cap.rotation.set(0, 0.32, 0);
        camera.position.set(1.25, 2.05, 4.9);
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