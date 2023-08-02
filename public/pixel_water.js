import * as THREE from 'three';

import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from './jsm/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from './jsm/postprocessing/OutputPass.js';
import { ShaderPass } from './jsm/postprocessing/ShaderPass.js';
import { PaletteShader } from '/palette_shader.js';
import { C64Shader } from '/c64_shader.js';
import { DitheShader } from '/dither_shader.js';
import Stats from './jsm/libs/stats.module.js';
import { GUI } from './jsm/libs/lil-gui.module.min.js';
import { Water } from './jsm/objects/Water.js';
import { Sky } from './jsm/objects/Sky.js';

let camera, scene, renderer, composer, crystalMesh, clock;
let gui, params;
let sun, sky, water, cube;

init();
animate();

function init() {

    const aspectRatio = window.innerWidth / window.innerHeight;

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(30, 30, 100);
    // camera = new THREE.OrthographicCamera( - aspectRatio, aspectRatio, 1, - 1, 0.1, 10 );
    // camera.position.y = 2 * Math.tan( Math.PI / 6 );
    // camera.position.z = 2;

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x151729 );

    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    //renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    composer = new EffectComposer( renderer );
    const renderPixelatedPass = new RenderPixelatedPass( 6, scene, camera );
    composer.addPass( renderPixelatedPass );

    const outputPass = new OutputPass();
    composer.addPass( outputPass );

    const paletteUniform = [ new THREE.Color( 0xFDC5B6),
                                                new THREE.Color( 0xC8DCDC),
                                                    new THREE.Color( 0xEEE0BE),
                                                        new THREE.Color( 0xF5FEEA),
                                                            new THREE.Color( 0xFFFFFF),
                                                                new THREE.Color( 0xFFFFCC),
                                                                    new THREE.Color( 0xB4B7AD),
                                                                        new THREE.Color( 0xBFD6DA),
                                                                            new THREE.Color( 0x68777D),
                                                                                new THREE.Color( 0x6C7C84)];

    
    const PaletteShaderPass = new ShaderPass( PaletteShader );
    PaletteShaderPass.uniforms[ 'palette' ].value = paletteUniform;
    composer.addPass( PaletteShaderPass );

    window.addEventListener( 'resize', onWindowResize );

        // gui

    gui = new GUI();
    params = { pixelSize: 6, normalEdgeStrength: .3, depthEdgeStrength: .4, pixelAlignedPanning: true };
    gui.add( params, 'pixelSize' ).min( 1 ).max( 16 ).step( 1 )
        .onChange( () => {

            renderPixelatedPass.setPixelSize( params.pixelSize );

        } );
    gui.add( renderPixelatedPass, 'normalEdgeStrength' ).min( 0 ).max( 2 ).step( .05 );
    gui.add( renderPixelatedPass, 'depthEdgeStrength' ).min( 0 ).max( 1 ).step( .05 );
    gui.add( params, 'pixelAlignedPanning' );
    
    //water

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 10, 0);
    controls.minDistance = 40.0;
    controls.maxDistance = 200.0;
    //controls.maxZoom = 2;

    sun = new THREE.Vector3();
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    water = new Water(
        waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        alpha: 1.0,
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    }
    );
    water.rotation.x = -Math.PI / 2;

    scene.add(water);

    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    let uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = 10;
    uniforms['rayleigh'].value = 2;
    uniforms['mieCoefficient'].value = 0.005;
    uniforms['mieDirectionalG'].value = 0.8;

    const parameters = {
        inclination: 0.49,
        azimuth: 0.205
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    function updateSun() {

        var theta = Math.PI * (parameters.inclination - 0.5);
        var phi = 2 * Math.PI * (parameters.azimuth - 0.5);

        sun.x = Math.cos(phi);
        sun.y = Math.sin(phi) * Math.sin(theta);
        sun.z = Math.sin(phi) * Math.cos(theta);

        sky.material.uniforms['sunPosition'].value.copy(sun);
        water.material.uniforms['sunDirection'].value.copy(sun).normalize();

        scene.environment = pmremGenerator.fromScene(sky).texture;
    }

    updateSun();

    const geometry = new THREE.BoxGeometry(30, 30, 30);
    const material = new THREE.MeshStandardMaterial({
        roughness: 0
    });

    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    //end water

    const skyFolder = gui.addFolder('Sky');
    skyFolder.add(parameters, 'inclination', 0, 0.5, 0.0001).onChange(updateSun);
    skyFolder.add(parameters, 'azimuth', 0, 1, 0.0001).onChange(updateSun);
    skyFolder.open();

    const waterFolder = gui.addFolder('Water');
    waterFolder.add(water.material.uniforms.distortionScale, 'value', 0, 8, 0.1).name('distortionScale');
    waterFolder.add(water.material.uniforms.size, 'value', 0.1, 10, 0.1).name('size');
    waterFolder.add(water.material, 'opacity', 0, 1, 0.01).name('opacity');
    
    waterFolder.open();
        

}

function onWindowResize() {

    const aspectRatio = window.innerWidth / window.innerHeight;
    camera.left = - aspectRatio;
    camera.right = aspectRatio;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    composer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

    requestAnimationFrame(animate);

    var time = performance.now() * 0.001;

    cube.position.y = Math.sin(time) * 20 + 5;
    cube.rotation.x = time * 0.5;
    cube.rotation.z = time * 0.51;

    water.material.uniforms['time'].value += 1.0 / 60.0;

    const rendererSize = renderer.getSize( new THREE.Vector2() );
    const aspectRatio = rendererSize.x / rendererSize.y;
    if ( params[ 'pixelAlignedPanning' ] ) {

        pixelAlignFrustum( camera, aspectRatio, Math.floor( rendererSize.x / params[ 'pixelSize' ] ),
            Math.floor( rendererSize.y / params[ 'pixelSize' ] ) );

    } else if ( camera.left != - aspectRatio || camera.top != 1.0 ) {

        // Reset the Camera Frustum if it has been modified
        camera.left = - aspectRatio;
        camera.right = aspectRatio;
        camera.top = 1.0;
        camera.bottom = - 1.0;
        camera.updateProjectionMatrix();

    }

    composer.render();

}

// Helper functions

function pixelTexture( texture ) {

    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;

}

function easeInOutCubic( x ) {

    return x ** 2 * 3 - x ** 3 * 2;

}

function linearStep( x, edge0, edge1 ) {

    const w = edge1 - edge0;
    const m = 1 / w;
    const y0 = - m * edge0;
    return THREE.MathUtils.clamp( y0 + m * x, 0, 1 );

}

function stopGoEased( x, downtime, period ) {

    const cycle = ( x / period ) | 0;
    const tween = x - cycle * period;
    const linStep = easeInOutCubic( linearStep( tween, downtime, period ) );
    return cycle + linStep;

}

function pixelAlignFrustum( camera, aspectRatio, pixelsPerScreenWidth, pixelsPerScreenHeight ) {

    // 0. Get Pixel Grid Units
    const worldScreenWidth = ( ( camera.right - camera.left ) / camera.zoom );
    const worldScreenHeight = ( ( camera.top - camera.bottom ) / camera.zoom );
    const pixelWidth = worldScreenWidth / pixelsPerScreenWidth;
    const pixelHeight = worldScreenHeight / pixelsPerScreenHeight;

    // 1. Project the current camera position along its local rotation bases
    const camPos = new THREE.Vector3(); camera.getWorldPosition( camPos );
    const camRot = new THREE.Quaternion(); camera.getWorldQuaternion( camRot );
    const camRight = new THREE.Vector3( 1.0, 0.0, 0.0 ).applyQuaternion( camRot );
    const camUp = new THREE.Vector3( 0.0, 1.0, 0.0 ).applyQuaternion( camRot );
    const camPosRight = camPos.dot( camRight );
    const camPosUp = camPos.dot( camUp );

    // 2. Find how far along its position is along these bases in pixel units
    const camPosRightPx = camPosRight / pixelWidth;
    const camPosUpPx = camPosUp / pixelHeight;

    // 3. Find the fractional pixel units and convert to world units
    const fractX = camPosRightPx - Math.round( camPosRightPx );
    const fractY = camPosUpPx - Math.round( camPosUpPx );

    // 4. Add fractional world units to the left/right top/bottom to align with the pixel grid
    camera.left = - aspectRatio - ( fractX * pixelWidth );
    camera.right = aspectRatio - ( fractX * pixelWidth );
    camera.top = 1.0 - ( fractY * pixelHeight );
    camera.bottom = - 1.0 - ( fractY * pixelHeight );
    camera.updateProjectionMatrix();

}