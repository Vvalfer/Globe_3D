document.addEventListener('DOMContentLoaded', function() {

    var canvas = document.getElementById("renderCanvas");
    var engine = new BABYLON.Engine(canvas, true);
    var scene;

    // Création de la scène
    var createScene = function () {
        var scene = new BABYLON.Scene(engine);
        var camera = new BABYLON.ArcRotateCamera("Camera", -Math.PI / 1, Math.PI / 3, 5, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(canvas, true); // création et position caméra 
        var sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(0, -0.7, 1), scene); // création et position lumière
        sunLight.intensity = 0.5; // intensité lumière
        sunLight.diffuse = new BABYLON.Color3(5, 5, 5); // valeur RGB pour diffusion lumière
        sunLight.specular = new BABYLON.Color3(0.4, 0.4, 0.4); // valeur RGB pour spécularité lumière
        scene.clearColor = new BABYLON.Color3(0, 0, 0);

        var shadowGenerator = new BABYLON.ShadowGenerator(1024, sunLight);
        shadowGenerator.useBlurExponentialShadowMap = false; // flou de l'ombre
        shadowGenerator.blurKernel = 20; // taille du flou
                            
        // Création d'un fond
        var background = BABYLON.Mesh.CreateSphere("background", 100, 1000, scene);
        background.material = new BABYLON.StandardMaterial("backgroundMat", scene);
        background.material.backFaceCulling = false;
        background.material.reflectionTexture = new BABYLON.CubeTexture("", scene);
        background.material.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        background.material.disableLighting = true;

        // Création du globe terrestre
        var earth = BABYLON.MeshBuilder.CreateSphere("earth", { diameter: 2 }, scene);
        var earthMaterial = new BABYLON.StandardMaterial("earthMaterial", scene);
        earthMaterial.diffuseTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/earth.jpg", scene);
        earth.material = earthMaterial;
        earthMaterial.diffuseTexture.uAng = Math.PI; // Inversion horizontale de la texture
        earthMaterial.diffuseTexture.vAng = Math.PI; // Inversion verticale de la texture

        var isUserInteracting = false;

        scene.onPointerDown = function () {
            isUserInteracting = true;
        }
        scene.onPointerUp = function () {
            isUserInteracting = false;
        }

        earth.rotation.y = 0; // Rotation initiale du globe

        scene.registerBeforeRender(function () { // Rotation continue du globe
            if (!isUserInteracting) {
                earth.rotation.y += 0.0006;
            }
        });

        // ombre
        shadowGenerator.getShadowMap().renderList.push(earth);
        earth.receiveShadows = true;
        
        // Création fond étoilé
        var particleSystem = new BABYLON.ParticleSystem("particles", 2000, scene);
        particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
        
        // Position où les particules sont émises
        particleSystem.emitter = new BABYLON.Vector3(100, 100, 100);

        // Configuration de la taille et de la couleur des particules
        particleSystem.minSize = 0.2;
        particleSystem.maxSize = 0.5;
        particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
        particleSystem.color2 = new BABYLON.Color4(1, 1, 1, 1);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);

        // Configuration de la durée de vie des particules
        particleSystem.minLifeTime = 1.5;
        particleSystem.maxLifeTime = 2.5;

        // Configuration de l'émission des particules
        particleSystem.emitRate = 1200;
        particleSystem.minEmitBox = new BABYLON.Vector3(-200, -200, -200);
        particleSystem.maxEmitBox = new BABYLON.Vector3(200, 200, 200);

        // Configuration de la direction des particules
        particleSystem.direction1 = new BABYLON.Vector3(0, 1, 0);
        particleSystem.direction2 = new BABYLON.Vector3(0, 1, 0);

        // Configuration de la vitesse des particules
        particleSystem.minEmitPower = 0;
        particleSystem.maxEmitPower = 0;
        particleSystem.updateSpeed = 0.003;

        // Démarrage du système de particules
        particleSystem.start();

        // Fonction pour convertir les coordonnées géographiques en coordonnées 3D
        function latLongToVector3(lat, lon, radius, height) {
            var lonOffset = 90
            var phi = (90 - lat) * (Math.PI / 180);
            var theta = ((lon + lonOffset + 180) % 360 + 180) * (Math.PI / 180);

            var x = -radius * Math.sin(phi) * Math.sin(theta);
            var y = radius * Math.cos(phi);
            var z = radius * Math.sin(phi) * Math.cos(theta);

            var position = new BABYLON.Vector3(x, y, z);
            var positionWithHeight = position.normalize().scale(radius + height);
            return positionWithHeight;
        }

        // Fonction pour ajouter un point interactif sur le globe
        function addPoint(lat, lon, height, scene, data) {
            BABYLON.SceneLoader.ImportMesh("", "./", "marqueurs.glb", scene, function (newMeshes) {
                var marker = newMeshes[0];

                marker.scaling = new BABYLON.Vector3(0.20, 0.20, 0.20); // Taille du marqueur
                marker.backFaceCulling = true; // Cacher les faces arrières du marqueur

                var position = latLongToVector3(lat, lon, 1.0, height); // Position du marqueur
                marker.position = position;

                marker.lookAt(new BABYLON.Vector3(5, 2, 0)); // Orientation du marqueur
                    
                // Créer un maillage de picking invisible qui enveloppe le marqueur
                var pickingMesh = BABYLON.MeshBuilder.CreateBox("pickingMesh", { size: 0.15 }, scene);
                var transparentMaterial = new BABYLON.StandardMaterial("transparentMaterial", scene);
                transparentMaterial.alpha = 0;
                pickingMesh.material = transparentMaterial;

                pickingMesh.position = marker.position;

                // Pop up
                pickingMesh.actionManager = new BABYLON.ActionManager(scene);
                pickingMesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function () {
                    var popup = document.getElementById('popup');

                    popup.style.display = 'block';

                    var popupTitle = document.getElementById('popup-title');
                    var popupImage = document.getElementById('popup-image');
                    var popupText = document.getElementById('popup-text');
                    var viewIn360Button = document.getElementById('view-360-button');
                    popupImage.src = data.image;
                    popupText.textContent = data.text;
                    popupTitle.textContent = data.title;
                    viewIn360Button.dataset.image360 = data.image360;

                    // Bouton pour ouvrir la vue 360
                    viewIn360Button.addEventListener('click', function() {
                        var imageUrl = this.dataset.image360;
                        var win = window.open('','_blank');
                        console.log(imageUrl);
                        open360View(win, imageUrl);
                    });

                    console.log("Point clicked at latitude " + lat + " and longitude " + lon);
                }));
                console.log("Point added at latitude " + lat + " and longitude " + lon);

                pickingMesh.parent = earth;
                marker.parent = earth;

            });
        }

        // Ajouter des marqueurs
        addPoint(46.8566, 2.3522, 0.05, scene, { title: 'Paris', image: 'paris.jpg', image360: 'paris360.jpeg', text: 'Welcome to Paris, Paris is the capital of France and his the most visited city on the world'}); // Paris
        addPoint(42.7128, -69.0060, 0.03, scene, { title: 'New York', image: 'newyork.jpg', image360: 'newyork360.jpeg', text: 'Welcome to New york one of the biggest city of USA'}); // New York

        // Activer la rotation de la scène avec la souris
        scene.onPointerObservable.add((eventData) => {
            if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                var popup = document.getElementById('popup');
                if (!popup.classList.contains('hide')) {
                    popup.style.display = 'none';
                }
                scene.onPointerMove = (eventData) => {
                    var previousPosition = null;
                    return (eventData) => {
                        if (previousPosition) {
                            var direction = {
                                x: eventData.event.clientX - previousPosition.x,
                                y: eventData.event.clientY - previousPosition.y
                            };
                            earth.rotation.y += direction.x / 100;
                            earth.rotation.x += direction.y / 100;
                        }
                        previousPosition = {
                            x: eventData.event.clientX,
                            y: eventData.event.clientY
                        };
                    };
                };
            } else if (eventData.type === BABYLON.PointerEventTypes.POINTERUP) {
                scene.onPointerMove = null;
            }
        });

        var lastZoomTime = 0;
        var zoomDelay = 100;
        
        // Action de zoom avec la molette
        scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERWHEEL:
                    var event = pointerInfo.event;
                    var delta = Math.sign(event.wheelDelta ? event.wheelDelta : -(event.deltaY || event.detail));
                    var currentTime = new Date().getTime();
                    if (currentTime - lastZoomTime > zoomDelay) {
                        if (delta > 0) {
                            // Zoom in
                            if (camera.radius > 2.5) { 
                                camera.radius -= 0.01; // vitesse
                            }
                        } else {
                            // Zoom out
                            if (camera.radius < 5) {
                                camera.radius += 0.02; // vitesse
                            }
                        }
                        lastZoomTime = currentTime;
                    }
                    break;
            }
        });

        camera.lowerRadiusLimit = 2.5; // limite rapprochement caméra
        camera.upperRadiusLimit = 5; // limite distance max caméra

        return scene;
    };
        

    var scene = createScene();

    // Lancement de la scène
    engine.runRenderLoop(function () {
        if (scene) {
            scene.render();
        }
    });

    window.addEventListener("resize", function () {
        engine.resize();
    });
});