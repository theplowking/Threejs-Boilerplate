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
import { OBJLoader } from './jsm/loaders/OBJLoader.js';

import { STLLoader } from "./jsm/loaders/STLLoader.js";
import { GLTFLoader } from "./jsm/loaders/GLTFLoader.js";


import { ImprovedNoise } from './jsm/math/ImprovedNoise.js';

import particleFire from './node/three-particle-fire/dist/three-particle-fire.module.js';

particleFire.install( { THREE: THREE } );

let camera, scene, renderer, composer, crystalMesh, clock;
let gui, params;
let sun, sky, water, cube, particleFireMesh0, light;

// Initialize variables for smooth panning
const panSpeed = 0.05;
let panDirection = new THREE.Vector3();
// Handle keyboard input
let keyboardState= [];

init();
animate();

function init() {

    const aspectRatio = window.innerWidth / window.innerHeight;

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    //camera.position.set(30, 30, 50);
    camera.position.set(-8.211999317769644, 11.9333257833447, 43.87784171728374);
    camera.rotation.set(-0.18255017207725938,-0.1476826359968106,-0.02715733610671468);

    // camera = new THREE.OrthographicCamera( - aspectRatio, aspectRatio, 1, - 1, 0.1, 1000 );
    // camera.position.y = 2 * Math.tan( Math.PI / 6 );
    // camera.position.z = 2;
    camera.zoom = 4;

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x151729 );

    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    //renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );

    //from sun settings
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.5;

    document.body.appendChild( renderer.domElement );

    composer = new EffectComposer( renderer );
    const renderPixelatedPass = new RenderPixelatedPass( 6, scene, camera );
    composer.addPass( renderPixelatedPass );

    const outputPass = new OutputPass();
    composer.addPass( outputPass );

    // const paletteUniform = [ new THREE.Color( 0xFDC5B6),
    //                                             new THREE.Color( 0xC8DCDC),
    //                                                 new THREE.Color( 0xEEE0BE),
    //                                                     new THREE.Color( 0xF5FEEA),
    //                                                         new THREE.Color( 0xFFFFFF),
    //                                                             new THREE.Color( 0xFFFFCC),
    //                                                                 new THREE.Color( 0xB4B7AD),
    //                                                                     new THREE.Color( 0xBFD6DA),
    //                                                                         new THREE.Color( 0x68777D),
    //                                                                             new THREE.Color( 0x6C7C84),
    //                                                                             new THREE.Color( 0x1D4128)];
    

    // const paletteSource = [0xFEA85A, 0xB24324, 0xDFB878, 0xF59965, 0xA0965C, 0x1A1B0F,
    //                         0x968B63, 0xD18733, 0xFA4120, 0xAE0C0E,
    //                         0x1D4128]
    // const paletteSource = [
    //     //sun 
    //     0xFFAC5D,
    //     //sky 
    //     0xC98C50, 0xD6A96F, 0x8C8754, 0xAF5A33, 0xA29663,
    //     //base 
    //     0x151108, 0x3D170E, 0x2A482D, 0x9B845C, 0xB32E22, 0x877A57, 0x925D41, 0x6C523B ]

        const paletteSource = [0xfeac5d, 0xc98c50, 0xaf936e, 0x8c8754, 0xcc551e, 0xa29663, 0x2e2a1f, 0x000000, 0x2a482d, 0x9b845c, 0xb32e22, 0x877a57, 0x7d2a1c, 0xa79d6c]
        
        //0xD6B98A, 0xE29F5E, 0xB1A487, 0x97977A, 0x8B8E7A, 0x828A75, 0xCA6B2C, 0x6C7C6A, 0xD14521, 0x61725D, 0x263D2A, 0x283929, 0x2B382A, 0x1B150A, 0x161106, 0x161106]

    let paletteUniform = [];
    paletteSource.forEach(function (colPal, index) {
        paletteUniform.push(new THREE.Color( colPal).convertLinearToSRGB());
        });                                           
    console.log(paletteSource, paletteUniform, paletteUniform.length);
    paletteUniform.forEach((e) => {console.log("0x" + e.clone().convertSRGBToLinear().getHexString() +  ",");});
    
    const PaletteShaderPass = new ShaderPass( PaletteShader );
    PaletteShaderPass.uniforms[ 'palette' ].value = paletteUniform;
    PaletteShaderPass.uniforms[ 'paletteSize' ].value = paletteUniform.length;
    composer.addPass( PaletteShaderPass );

    window.addEventListener( 'resize', onWindowResize );

    
    document.addEventListener('keydown', (event) => {
    keyboardState[event.key] = true;
    });

    document.addEventListener('keyup', (event) => {
    keyboardState[event.key] = false;
    });

        // gui

    gui = new GUI();
    params = { pixelSize: 6, normalEdgeStrength: .3, depthEdgeStrength: .4, pixelAlignedPanning: true,
        sunColor: 0xc0540c,
        waterColor: 0x13aa63,
        towerColor: 0x9B9665 };
    gui.add( params, 'pixelSize' ).min( 1 ).max( 16 ).step( 1 )
        .onChange( () => {

            renderPixelatedPass.setPixelSize( params.pixelSize );

        } );
    gui.add( renderPixelatedPass, 'normalEdgeStrength' ).min( 0 ).max( 2 ).step( .05 );
    gui.add( renderPixelatedPass, 'depthEdgeStrength' ).min( 0 ).max( 1 ).step( .05 );
    gui.add( params, 'pixelAlignedPanning' );

    //materials

    // const threeTone = new THREE.TextureLoader().load('threeTone.jpg')
    // threeTone.minFilter = THREE.NearestFilter
    // threeTone.magFilter = THREE.NearestFilter

    //var materialBuilding = new THREE.MeshPhongMaterial( { color: 0xdc9d82, specular: 0x111111, shininess: 2 } ); //0xff5533 //0xefdab1
    
    //materialBuilding.flatShading = true

    const bumpTexture = new THREE.TextureLoader().load('textures/calacatta.png')
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.RepeatWrapping;
    bumpTexture.repeat.set( 6, 6 );
    // material.
    // material.
    const materialBuilding = new THREE.MeshStandardMaterial({
        roughness: 0,
        bumpMap: bumpTexture,
        bumpScale: 0.1,
        color: params.towerColor,
        flatShading: true
    });
    
    // basic monochromatic energy preservation
    //const diffuseColor = new THREE.Color().setHSL( alpha, 0.5, gamma * 0.5 + 0.1 ).multiplyScalar( 1 - beta * 0.2 );

    // const materialBuilding = new THREE.MeshToonMaterial( {
    //     color: 0xdc9d82,
    //     gradientMap: threeTone
    // } );

    //objects

    // const loader = new OBJLoader();
    // loader.load( '/towerus/monkey.obj', function ( geometry ) {

    //     const mesh = new THREE.Mesh( geometry, materialBuilding );

    //     mesh.position.set( 0, -25,0 );
    //     mesh.rotation.set( - Math.PI / 2, 0,  0 );
    //     //mesh.scale.set( 0.02, 0.02, 0.02 );
    //     let s=10;
    //     mesh.scale.set( s, s, s );

    //     mesh.castShadow = true;
    //     mesh.receiveShadow = true;

    //     scene.add( mesh );

    // } );

    // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })

    const objLoader = new OBJLoader()
    objLoader.load(
        '/towerus/towerus.obj',
        (object) => {
            object.children[0].material = materialBuilding
            object.traverse(function (child) {
                if (child.isMesh) {
                    child.material = materialBuilding
                }
            })
            let s=10;
            object.position.set( 0, -35.2,0 );
            object.rotation.set( - Math.PI / 2, 0,  0 );
            object.scale.set( s, s, s );
            scene.add(object)
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
            console.log(error)
        }
    )
    
    //water

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 10, 0);
    controls.minDistance = 10.0;
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
        sunColor: params.sunColor,
        waterColor: params.waterColor,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    }
    );
    water.rotation.x = -Math.PI / 2;

    scene.add(water);

    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        elevation: 0,
        azimuth: 180,
        exposure: renderer.toneMappingExposure
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    function updateSun() {

        const uniforms = sky.material.uniforms;
        uniforms[ 'turbidity' ].value = effectController.turbidity;
        uniforms[ 'rayleigh' ].value = effectController.rayleigh;
        uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
        uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
        const theta = THREE.MathUtils.degToRad( effectController.azimuth );

        sun.setFromSphericalCoords( 1, phi, theta );

        sky.material.uniforms['sunPosition'].value.copy(sun);
        water.material.uniforms['sunDirection'].value.copy(sun).normalize();

        uniforms[ 'sunPosition' ].value.copy( sun );

        renderer.toneMappingExposure = effectController.exposure;
        renderer.render( scene, camera );

        // var theta = Math.PI * (parameters.inclination - 0.5);
        // var phi = 2 * Math.PI * (parameters.azimuth - 0.5);

        // sun.x = Math.cos(phi);
        // sun.y = Math.sin(phi) * Math.sin(theta);
        // sun.z = Math.sin(phi) * Math.cos(theta);

        // sky.material.uniforms['sunPosition'].value.copy(sun);
        // water.material.uniforms['sunDirection'].value.copy(sun).normalize();

        scene.environment = pmremGenerator.fromScene(sky).texture;
    }

    updateSun();

    //end water

    const skyFolder = gui.addFolder('Sky');
    // skyFolder.add(parameters, 'inclination', 0, 0.5, 0.0001).onChange(updateSun);
    // skyFolder.add(parameters, 'azimuth', 0, 1, 0.0001).onChange(updateSun);

        skyFolder.add( effectController, 'turbidity', 0.0, 20.0, 0.1 ).onChange( updateSun );
        skyFolder.add( effectController, 'rayleigh', 0.0, 4, 0.001 ).onChange( updateSun );
        skyFolder.add( effectController, 'mieCoefficient', 0.0, 0.1, 0.001 ).onChange( updateSun );
        skyFolder.add( effectController, 'mieDirectionalG', 0.0, 1, 0.001 ).onChange( updateSun );
        skyFolder.add( effectController, 'elevation', 0, 90, 0.1 ).onChange( updateSun );
        skyFolder.add( effectController, 'azimuth', - 180, 180, 0.1 ).onChange( updateSun );
        skyFolder.add( effectController, 'exposure', 0, 1, 0.0001 ).onChange( updateSun );
    skyFolder.close();

    const waterFolder = gui.addFolder('Water');
    waterFolder.add(water.material.uniforms.distortionScale, 'value', 0, 8, 0.1).name('distortionScale');
    waterFolder.add(water.material.uniforms.size, 'value', 0.1, 10, 0.1).name('size');
    waterFolder.add(water.material.uniforms.alpha, 'value', 0, 1, 0.01).name('alpha');
    waterFolder.addColor(params, 'sunColor')
				.name('Sun Color')
				.onChange(function() {
					water.material.uniforms.sunColor.value.set(params.sunColor);
				});
    waterFolder.addColor(params, 'waterColor')
				.name('Water Color')
				.onChange(function() {
					water.material.uniforms.waterColor.value.set(params.waterColor);
				});
    waterFolder.addColor(params, 'towerColor')
				.name('Tower Color')
				.onChange(function() {
					materialBuilding.color.set(params.towerColor);
				});
    waterFolder.close();

    const paletteFolder = gui.addFolder('Palette');

    paletteUniform.forEach(function (colPal, index) {
        paletteUniform.push(new THREE.Color( colPal));
        paletteFolder.addColor(paletteUniform, index)
				.name(index)
				.onChange(function(col) {
                    //console.log(col, col.getHexString(),col.convertLinearToSRGB().getHexString(), col.convertSRGBToLinear().getHexString() );
					//var temp = new THREE.Color(col);
                    //console.log(temp, temp.getHexString(),temp.convertLinearToSRGB().getHexString(), temp.convertSRGBToLinear().getHexString() )
                    PaletteShaderPass.uniforms[ 'palette' ].value = paletteUniform;
                    let t=[];
                    paletteUniform.forEach((e) => {t.push("0x" + e.clone().convertSRGBToLinear().getHexString());}); //convertLinearToSRGB()
                    //paletteUniform.forEach((e) => {console.log("0x" + e.clone().convertSRGBToLinear().getHexString() +  ",");});
                    console.log(t.slice(0,paletteSource.length));
				});
    }); 

    paletteFolder.open();

    //add fire

    var fireRadius = 1;
    var fireHeight = 5;
    var particleCount = 2000;
    var height = window.innerHeight;

    var geometry0 = new particleFire.Geometry( fireRadius, fireHeight, particleCount );
    var material0 = new particleFire.Material( { color: 0xff2200 } );
    material0.setPerspective( camera.fov, height );
    particleFireMesh0 = new THREE.Points( geometry0, material0 );
    particleFireMesh0.position.set( 0, 5,0 );
    scene.add( particleFireMesh0 );

    //add fire light
    light = new THREE.PointLight( 0xff2200, 100, 100, 1 ); //0xffffff //0xa333b6
    //light.position.set( 0, 16, 0  );
    light.castShadow = true;
    //light.shadow.bias = 0.0001;
    scene.add( light );

}

function onWindowResize() {

    const aspectRatio = window.innerWidth / window.innerHeight;
    camera.left = - aspectRatio;
    camera.right = aspectRatio;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    composer.setSize( window.innerWidth, window.innerHeight );

    //console.log(camera);
    //paletteUniform.forEach((e) => {console.log("0x" + e.convertSRGBToLinear().getHexString() +  ",");});

}

function animate() {

    requestAnimationFrame(animate);

    var time = performance.now() * 0.001;

    // cube.position.y = Math.sin(time) * 20 + 5;
    // cube.rotation.x = time * 0.5;
    // cube.rotation.z = time * 0.51;

    water.material.uniforms['time'].value += 1.0 / 60.0 / 10;

    flickerAnimation(time);

    var delta = clock.getDelta();

    particleFireMesh0.material.update( time / 20000 );

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

    // handle keyboard
    // Check keyboard input
    panDirection.set(0, 0, 0);

    if (keyboardState['ArrowUp']) {
        panDirection.y += 1;
    }
    if (keyboardState['ArrowDown']) {
        panDirection.y -= 1;
    }
    if (keyboardState['ArrowLeft']) {
        panDirection.x -= 1;
    }
    if (keyboardState['ArrowRight']) {
        panDirection.x += 1;
    }

    // Update camera position for panning
    camera.position.x += panDirection.x * panSpeed;
    camera.position.y += panDirection.y * panSpeed;
    camera.lookAt(particleFireMesh0.position)

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

// Define the flicker animation
function flickerAnimation(time) {
    // Randomly adjust the intensity and distance of the light
    const intensity = (new ImprovedNoise().noise(time, 0, 0) * 3) + 21; //THREE.MathUtils.randFloat(0.8, 1.0);
    const distance = (new ImprovedNoise().noise(time, 0, 0) * 0.3) + 21;
    light.intensity = intensity;
    light.distance = distance;
    var range = 0.1;
    light.position.set( particleFireMesh0.position.x + (new ImprovedNoise().noise(time*2, 0, 0) * range) - (range*2),
                        particleFireMesh0.position.y + (new ImprovedNoise().noise(0, time*2, 0) * range) - (range*2),
                        particleFireMesh0.position.z + 2 + (new ImprovedNoise().noise(0, 0, time*2) * range) - (range*2) );

};