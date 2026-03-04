// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCLEkACbZT1gMs9BGkiuxJxSvsHJGKTryk",
  authDomain: "babel-e12d7.firebaseapp.com",
  databaseURL: "https://babel-e12d7-default-rtdb.firebaseio.com",
  projectId: "babel-e12d7",
  storageBucket: "babel-e12d7.firebasestorage.app",
  messagingSenderId: "825559802990",
  appId: "1:825559802990:web:07446bfa45edf3358d327f"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();
let currentUser = null;

// Login Google
function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithRedirect(provider);
}

auth.getRedirectResult().then(result => {
  if(result.user) currentUser = result.user;
}).catch(console.log);

auth.onAuthStateChanged(user => {
  if(user){
    currentUser = user;
    document.getElementById("login").style.display = "none";
    document.getElementById("welcome").innerText = "مرحباً " + user.displayName;
    db.ref("users/"+user.uid).set({name:user.displayName,photo:user.photoURL||""});
    loadSmartFeed();
    loadStories();
  }
});

// Send Post
async function sendPost() {
  if(!currentUser) return;
  const text = document.getElementById("postText").value;
  const file = document.getElementById("mediaInput").files[0];
  if(!text && !file) return;
  let mediaURL=null,mediaType=null;
  if(file){
    const ref = storage.ref("media/"+Date.now()+"_"+file.name);
    await ref.put(file);
    mediaURL = await ref.getDownloadURL();
    mediaType = file.type.startsWith("video")?"video":"image";
  }
  const newPostRef = db.ref("posts").push();
  await newPostRef.set({uid:currentUser.uid,author:currentUser.displayName,text:text||"",mediaURL,mediaType,likes:0,comments:{},time:firebase.database.ServerValue.TIMESTAMP});
  document.getElementById("postText").value="";
  document.getElementById("mediaInput").value="";
  renderPost(newPostRef.key,{uid:currentUser.uid,author:currentUser.displayName,text:text||"",mediaURL,mediaType,likes:0,comments:{},time:Date.now()});
}

// Render Post
function renderPost(id,p){
  const feed=document.getElementById("feed");
  let mediaHTML="";
  if(p.mediaURL) mediaHTML=p.mediaType==="video"?`<video src="${p.mediaURL}" controls></video>`:`<img src="${p.mediaURL}">`;
  let commentsHTML="";
  if(p.comments) Object.values(p.comments).forEach(c=>{commentsHTML+=`<div class="comment"><b>${c.user}:</b> ${c.text}</div>`;});
  const postCard=document.createElement("div");
  postCard.className="card"; postCard.id="post-"+id;
  postCard.innerHTML=`<b>${p.author}</b><p>${p.text}</p>${mediaHTML}<div class="like" onclick="addLike('${id}')">❤️ <span id="like-count-${id}">${p.likes||0}</span></div><div class="comments-section" id="comments-${id}">${commentsHTML}<div class="comment-input-area"><input type="text" id="com-in-${id}" placeholder="اكتب تعليقاً حياً..."><button onclick="sendComment('${id}')">↩</button></div></div>`;
  feed.prepend(postCard);
}

// Load Feed
function loadSmartFeed(){
  db.ref("posts").on("value",snap=>{
    const feed=document.getElementById("feed"); feed.innerHTML="";
    if(!snap.exists()){ feed.innerHTML="<p>لا توجد منشورات حتى الآن.</p>"; return;}
    snap.forEach(child=>{ const p=child.val(); p.key=child.key; renderPost(p.key,p);});
  });
}

// Likes
function addLike(postId){
  const likeCountElem=document.getElementById("like-count-"+postId);
  const currentLikes=parseInt(likeCountElem.innerText);
  db.ref("posts/"+postId+"/likes").set(currentLikes+1);
  likeCountElem.innerText=currentLikes+1;
}

// Comments
function sendComment(postId){
  const input=document.getElementById("com-in-"+postId); if(!input.value) return;
  const commentRef=db.ref("posts/"+postId+"/comments").push();
  commentRef.set({user:currentUser.displayName,text:input.value});
  const commentsSection=document.getElementById("comments-"+postId);
  const newComment=document.createElement("div"); newComment.className="comment";
  newComment.innerHTML=`<b>${currentUser.displayName}:</b> ${input.value}`;
  commentsSection.insertBefore(newComment,commentsSection.querySelector(".comment-input-area"));
  input.value="";
}

// Stories
function loadStories(){
  db.ref("stories").on("value",snap=>{
    const bar=document.getElementById("storiesBar"); bar.innerHTML="";
    snap.forEach(child=>{
      const s=child.val();
      if(Date.now()-s.time>86400000) return;
      const el=document.createElement("div"); el.style.width="70px"; el.style.height="70px"; el.style.borderRadius="50%"; el.style.overflow="hidden"; el.style.cursor="pointer";
      if(s.mediaType==="image") el.innerHTML=`<img src="${s.mediaURL}" style="width:100%;height:100%;object-fit:cover;">`;
      else el.innerHTML=`<video src="${s.mediaURL}" style="width:100%;height:100%;object-fit:cover;"></video>`;
      el.onclick=()=>viewStory(s.mediaURL,s.mediaType);
      bar.appendChild(el);
    });
  });
}

function viewStory(url,type){
  const overlay=document.createElement("div");
  overlay.style.position="fixed"; overlay.style.inset="0"; overlay.style.background="#000"; overlay.style.zIndex="7000"; overlay.style.display="flex"; overlay.style.alignItems="center"; overlay.style.justifyContent="center";
  overlay.onclick=()=>overlay.remove();
  overlay.innerHTML=type==="image"?`<img src="${url}" style="max-width:90%;max-height:90%;">`:`<video src="${url}" autoplay controls style="max-width:90%;max-height:90%;"></video>`;
  document.body.appendChild(overlay);
}