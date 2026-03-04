// Firebase Config
const firebaseConfig={apiKey:"AIzaSyCLEkACbZT1gMs9BGkiuxJxSvsHJGKTryk",authDomain:"babel-e12d7.firebaseapp.com",databaseURL:"https://babel-e12d7-default-rtdb.firebaseio.com",projectId:"babel-e12d7",storageBucket:"babel-e12d7.firebasestorage.app",messagingSenderId:"825559802990",appId:"1:825559802990:web:07446bfa45edf3358d327f"};
firebase.initializeApp(firebaseConfig);
const auth=firebase.auth(),db=firebase.database(),storage=firebase.storage();
let currentUser=null;

// Login
function login(){const provider=new firebase.auth.GoogleAuthProvider();auth.signInWithRedirect(provider);}
auth.getRedirectResult().then(result=>{if(result.user) currentUser=result.user;}).catch(console.log);
auth.onAuthStateChanged(user=>{
  if(user){currentUser=user;
    document.getElementById("login").style.display="none";
    document.getElementById("welcome").innerText="مرحباً "+user.displayName;
    db.ref("users/"+user.uid).set({name:user.displayName,photo:user.photoURL||""});
    db.ref("status/"+user.uid).set({online:true,lastSeen:firebase.database.ServerValue.TIMESTAMP}).onDisconnect().set({online:false,lastSeen:firebase.database.ServerValue.TIMESTAMP});
    loadSmartFeed(); loadStories();
  }
});

// Send Post
async function sendPost(){if(!currentUser) return;
  const text=document.getElementById("postText").value;const file=document.getElementById("mediaInput").files[0];if(!text && !file) return;
  let mediaURL=null,mediaType=null;
  if(file){const ref=storage.ref("media/"+Date.now()+"_"+file.name);await ref.put(file);mediaURL=await ref.getDownloadURL();mediaType=file.type.startsWith("video")?"video":"image";}
  db.ref("posts").push({uid:currentUser.uid,author:currentUser.displayName,text:text||"",mediaURL,mediaType,likes:0,time:firebase.database.ServerValue.TIMESTAMP});
  document.getElementById("postText").value="";document.getElementById("mediaInput").value="";
}

// Feed
function loadSmartFeed(){
  db.ref("followers/"+currentUser.uid).once("value").then(snap=>{
    const followingIds=Object.keys(snap.val()||{});
    db.ref("posts").on("value",psnap=>{
      const feed=document.getElementById("feed");feed.innerHTML="";
      let postsArr=[];
      psnap.forEach(child=>{const p=child.val();p.key=child.key;postsArr.push(p);});
      postsArr.sort((a,b)=>{const aF=followingIds.includes(a.uid)?1:0,bF=followingIds.includes(b.uid)?1:0;if(aF!==bF) return bF-aF;return b.time-b.time;});
      postsArr.forEach(p=>{
        let media=""; if(p.mediaURL) media=p.mediaType==="video"?`<video src="${p.mediaURL}" controls></video>`:`<img src="${p.mediaURL}" loading="lazy">`;
        feed.innerHTML+=`<div class="card"><b>${p.author}</b><p>${p.text}</p>${media}<div class="like" onclick="addLike('${p.key}',${p.likes||0})">❤️ ${p.likes||0}</div></div>`;
      });
    });
  });
}

// Stories
function loadStories(){
  db.ref("stories").on("value",snap=>{
    const bar=document.getElementById("storiesBar");bar.innerHTML="";
    snap.forEach(child=>{
      const s=child.val();if(Date.now()-s.time>86400000) return;
      const el=document.createElement("div");el.style.width="70px";el.style.height="70px";el.style.borderRadius="50%";el.style.overflow="hidden";el.style.cursor="pointer";
      if(s.mediaType==="image") el.innerHTML=`<img src="${s.mediaURL}" style="width:100%;height:100%;object-fit:cover;">`; else el.innerHTML=`<video src="${s.mediaURL}" style="width:100%;height:100%;object-fit:cover;"></video>`;
      el.onclick=()=>viewStory(s.mediaURL,s.mediaType);bar.appendChild(el);
    });
  });
}
function viewStory(url,type){const overlay=document.createElement("div");overlay.style.position="fixed";overlay.style.inset="0";overlay.style.background="#000";overlay.style.zIndex="7000";overlay.style.display="flex";overlay.style.alignItems="center";overlay.style.justifyContent="center";overlay.onclick=()=>overlay.remove();overlay.innerHTML=type==="image"?`<img src="${url}" style="max-width:90%;max-height:90%;">`:`<video src="${url}" autoplay controls style="max-width:90%;max-height:90%;"></video>`;document.body.appendChild(overlay);}

// Likes & Comments
function addLike(id,likes){db.ref("posts/"+id).update({likes:likes+1});}