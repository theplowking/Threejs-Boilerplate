import * as THREE from 'three';

import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from './jsm/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from './jsm/postprocessing/OutputPass.js';
import Stats from './jsm/libs/stats.module.js';
import { GUI } from './jsm/libs/lil-gui.module.min.js';
import { Water } from './jsm/objects/Water2.js';

let camera, scene, renderer, composer, crystalMesh, clock;
let gui;
let sun, sky, water, cube;

let torusKnot;

let params = {
    color: '#ffffff',
    scale: 4,
    flowX: 1,
    flowY: 1,
    pixelSize: 6, normalEdgeStrength: .3, depthEdgeStrength: .4, pixelAlignedPanning: true 
};

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

    window.addEventListener( 'resize', onWindowResize );

        // gui

    gui = new GUI();
    
    gui.add( params, 'pixelSize' ).min( 1 ).max( 16 ).step( 1 )
        .onChange( () => {

            renderPixelatedPass.setPixelSize( params.pixelSize );

        } );
    gui.add( renderPixelatedPass, 'normalEdgeStrength' ).min( 0 ).max( 2 ).step( .05 );
    gui.add( renderPixelatedPass, 'depthEdgeStrength' ).min( 0 ).max( 1 ).step( .05 );
    gui.add( params, 'pixelAlignedPanning' );
    
    //water

    // mesh

    const torusKnotGeometry = new THREE.TorusKnotGeometry( 3, 1, 256, 32 );
    const torusKnotMaterial = new THREE.MeshNormalMaterial();

    torusKnot = new THREE.Mesh( torusKnotGeometry, torusKnotMaterial );
    torusKnot.position.y = 4;
    torusKnot.scale.set( 0.5, 0.5, 0.5 );
    scene.add( torusKnot );

    // ground

    const groundGeometry = new THREE.PlaneGeometry( 20, 20 );
    const groundMaterial = new THREE.MeshStandardMaterial( { roughness: 0.8, metalness: 0.4 } );
    const ground = new THREE.Mesh( groundGeometry, groundMaterial );
    ground.rotation.x = Math.PI * - 0.5;
    scene.add( ground );

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load( 'textures/hardwood2_diffuse.jpg', function ( map ) {

        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.anisotropy = 16;
        map.repeat.set( 4, 4 );
        map.colorSpace = THREE.SRGBColorSpace;
        groundMaterial.map = map;
        groundMaterial.needsUpdate = true;

    } );

    // water

    const waterGeometry = new THREE.PlaneGeometry( 20, 20 );

    water = new Water( waterGeometry, {
        color: params.color,
        scale: params.scale,
        flowDirection: new THREE.Vector2( params.flowX, params.flowY ),
        textureWidth: 1024,
        textureHeight: 1024
    } );

    water.position.y = 1;
    water.rotation.x = Math.PI * - 0.5;
    scene.add( water );

    // skybox

    const cubeTextureLoader = new THREE.CubeTextureLoader();
    cubeTextureLoader.setPath( 'textures/park/' );

    const cubeTexture = cubeTextureLoader.load( [
        'posx.jpg', 'negx.jpg',
        'posy.jpg', 'negy.jpg',
        'posz.jpg', 'negz.jpg'
    ] );

    scene.background = cubeTexture;

    // light

    const ambientLight = new THREE.AmbientLight( 0xe7e7e7, 1.2 );
    scene.add( ambientLight );

    const directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
    directionalLight.position.set( - 1, 1, 1 );
    scene.add( directionalLight );

    //GUI

    gui.addColor( params, 'color' ).onChange( function ( value ) {

        water.material.uniforms[ 'color' ].value.set( value );

    } );
    gui.add( params, 'scale', 1, 10 ).onChange( function ( value ) {

        water.material.uniforms[ 'config' ].value.w = value;

    } );
    gui.add( params, 'flowX', - 1, 1 ).step( 0.01 ).onChange( function ( value ) {

        water.material.uniforms[ 'flowDirection' ].value.x = value;
        water.material.uniforms[ 'flowDirection' ].value.normalize();

    } );
    gui.add( params, 'flowY', - 1, 1 ).step( 0.01 ).onChange( function ( value ) {

        water.material.uniforms[ 'flowDirection' ].value.y = value;
        water.material.uniforms[ 'flowDirection' ].value.normalize();

    } );

    gui.open();

    //

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.minDistance = 5;
    controls.maxDistance = 50;

        

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

    const delta = clock.getDelta();

				torusKnot.rotation.x += delta;
				torusKnot.rotation.y += delta * 0.5;

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