// ===========================
// Firebase Config
// ===========================
const firebaseConfig = {
    apiKey: "AIzaSyCLEkACbZT1gMs9BGkiuxJxSvsHJGKTryk",
    authDomain: "babel-e12d7.firebaseapp.com",
    databaseURL: "https://babel-e12d7-default-rtdb.firebaseio.com",
    projectId: "babel-e12d7",
    storageBucket: "babel-e12d7.firebasestorage.app",
    messagingSenderId: "825559802990",
    appId: "1:825559802990:web:07446bfa45edf3358d327f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

let currentUser = null;

// ===========================
// Google Login
// ===========================
function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
}

auth.getRedirectResult().then(result => {
    if(result.user) {
        currentUser = result.user;
    }
}).catch(error => console.log(error));

auth.onAuthStateChanged(user => {
    if(user){
        currentUser = user;
        document.getElementById("login").style.display = "none";
        document.getElementById("welcome").innerText = "مرحباً " + user.displayName;

        // Add user to database if not exists
        db.ref("users/"+user.uid).set({
            name: user.displayName,
            photo: user.photoURL || ""
        });

        loadSmartFeed();
        loadStories();
    }
});

// ===========================
// Send Post
// ===========================
async function sendPost() {
    if(!currentUser) return;

    const text = document.getElementById("postText").value;
    const file = document.getElementById("mediaInput").files[0];

    if(!text && !file) return;

    let mediaURL = null;
    let mediaType = null;

    if(file){
        const ref = storage.ref("media/" + Date.now() + "_" + file.name);
        await ref.put(file);
        mediaURL = await ref.getDownloadURL();
        mediaType = file.type.startsWith("video") ? "video" : "image";
    }

    const newPostRef = db.ref("posts").push();
    await newPostRef.set({
        uid: currentUser.uid,
        author: currentUser.displayName,
        text: text || "",
        mediaURL: mediaURL,
        mediaType: mediaType,
        likes: 0,
        comments: {},
        time: firebase.database.ServerValue.TIMESTAMP
    });

    document.getElementById("postText").value = "";
    document.getElementById("mediaInput").value = "";

    // Render immediately
    renderPost(newPostRef.key, {
        uid: currentUser.uid,
        author: currentUser.displayName,
        text: text || "",
        mediaURL: mediaURL,
        mediaType: mediaType,
        likes: 0,
        comments: {},
        time: Date.now()
    });
}

// ===========================
// Render Post
// ===========================
function renderPost(postId, postData) {
    const feed = document.getElementById("feed");

    // Media HTML
    let mediaHTML = "";
    if(postData.mediaURL){
        if(postData.mediaType === "video"){
            mediaHTML = `<video src="${postData.mediaURL}" controls></video>`;
        } else {
            mediaHTML = `<img src="${postData.mediaURL}" alt="post media">`;
        }
    }

    // Comments HTML
    let commentsHTML = "";
    if(postData.comments){
        Object.values(postData.comments).forEach(c => {
            commentsHTML += `<div class="comment"><b>${c.user}:</b> ${c.text}</div>`;
        });
    }

    // Post Card
    const postCard = document.createElement("div");
    postCard.className = "card";
    postCard.id = "post-" + postId;
    postCard.innerHTML = `
        <b>${postData.author}</b>
        <p>${postData.text}</p>
        ${mediaHTML}
        <div class="like" onclick="addLike('${postId}')">
            ❤️ <span id="like-count-${postId}">${postData.likes || 0}</span>
        </div>
        <div class="comments-section" id="comments-${postId}">
            ${commentsHTML}
            <div class="comment-input-area">
                <input type="text" id="com-in-${postId}" placeholder="اكتب تعليقاً حياً...">
                <button onclick="sendComment('${postId}')">↩</button>
            </div>
        </div>
    `;
    feed.prepend(postCard);
}

// ===========================
// Load Feed
// ===========================
function loadSmartFeed(){
    db.ref("posts").on("value", snapshot => {
        const feed = document.getElementById("feed");
        feed.innerHTML = "";
        if(!snapshot.exists()){
            feed.innerHTML = "<p>لا توجد منشورات حتى الآن.</p>";
            return;
        }

        snapshot.forEach(child => {
            const post = child.val();
            post.key = child.key;
            renderPost(post.key, post);
        });
    });
}

// ===========================
// Likes
// ===========================
function addLike(postId){
    const likeElem = document.getElementById("like-count-" + postId);
    const currentLikes = parseInt(likeElem.innerText);
    db.ref("posts/" + postId + "/likes").set(currentLikes + 1);
    likeElem.innerText = currentLikes + 1;
}

// ===========================
// Comments
// ===========================
function sendComment(postId){
    const input = document.getElementById("com-in-" + postId);
    if(!input.value) return;

    const commentRef = db.ref("posts/" + postId + "/comments").push();
    commentRef.set({
        user: currentUser.displayName,
        text: input.value
    });

    // Render comment immediately
    const commentsSection = document.getElementById("comments-" + postId);
    const newComment = document.createElement("div");
    newComment.className = "comment";
    newComment.innerHTML = `<b>${currentUser.displayName}:</b> ${input.value}`;
    commentsSection.insertBefore(newComment, commentsSection.querySelector(".comment-input-area"));

    input.value = "";
}

// ===========================
// Stories
// ===========================
function loadStories(){
    db.ref("stories").on("value", snapshot => {
        const bar = document.getElementById("storiesBar");
        bar.innerHTML = "";
        snapshot.forEach(child => {
            const story = child.val();

            // Expire stories after 24h
            if(Date.now() - story.time > 24*60*60*1000) return;

            const el = document.createElement("div");
            el.style.cursor = "pointer";

            if(story.mediaType === "image"){
                el.innerHTML = `<img src="${story.mediaURL}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                el.innerHTML = `<video src="${story.mediaURL}" style="width:100%; height:100%; object-fit:cover;"></video>`;
            }

            el.onclick = () => viewStory(story.mediaURL, story.mediaType);
            bar.appendChild(el);
        });
    });
}

// View Story Overlay
function viewStory(url, type){
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "#000";
    overlay.style.zIndex = "7000";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.onclick = () => overlay.remove();

    if(type === "image"){
        overlay.innerHTML = `<img src="${url}" style="max-width:90%; max-height:90%;">`;
    } else {
        overlay.innerHTML = `<video src="${url}" autoplay controls style="max-width:90%; max-height:90%;"></video>`;
    }

    document.body.appendChild(overlay);
}
