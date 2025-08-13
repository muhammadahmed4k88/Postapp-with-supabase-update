// =================== SUPABASE SETUP ===================
const supabaseUrl = 'https://alsyjerexekuajnorbwl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsc3lqZXJleGVrdWFqbm9yYndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MTcxODQsImV4cCI6MjA2ODM5MzE4NH0.rxJ2zKAZCU6OQAwk0X1h8EY8kdX2bGOCBulBoingwlo';
const client = supabase.createClient(supabaseUrl, supabaseKey);

// =================== TOAST FUNCTION ===================
function showToast(message, type = "success") {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function firstLetterCapital(text) {
  if (!text) return "";
  text = text.trim().toLowerCase(); // pehle sab chhota karo
  return text.charAt(0).toUpperCase() + text.slice(1); // pehla letter bada
}

function isValidPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}



// =================== AUTH ===================
// Sign up
async function signup() {
  let name = firstLetterCapital(document.getElementById('name').value.trim());
  let email = document.getElementById('s-email').value.trim();
  let password = document.getElementById('s-pass').value.trim();

  if (!isValidPassword(password)) {
    showToast('Password must have: 1 capital, 1 small, 1 special character, min 8 chars.', 'error');
    return;
  }
  const { error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });

  if (error) {
    showToast('Signup Failed: ' + error.message, 'error');
  } else {
    showToast('Signup Successful! Please check your email to confirm.', 'success');
    setTimeout(() => window.location.href = "../login/login.html", 2000);
  }
}

// Login
async function login() {
  let Email = document.getElementById('email').value.trim();
  let Password = document.getElementById('pass').value.trim();

  const { error } = await client.auth.signInWithPassword({
    email: Email,
    password: Password
  });

  if (error) {
    showToast('Login Failed: ' + error.message, 'error');
  } else {
    showToast('Login Successful!', 'success');
    setTimeout(() => window.location.href = '../index.html', 1000);
  }
}

// Logout
async function logout() {
  await client.auth.signOut();
  showToast('Logged out!', 'success');
  setTimeout(() => window.location.href = '../login/login.html', 1000);
}

// =================== POSTS ===================
let editId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await client.auth.getUser();

  const form = document.getElementById('post-form');
  if (user && form) {
    form.style.display = 'block';
    render(user.id);
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = firstLetterCapital(document.getElementById('title').value.trim());
      const content = firstLetterCapital(document.getElementById('content').value.trim());
      const imageFile = document.getElementById('imageInput').files[0]
      

      const { data: userData } = await client.auth.getUser();
      const userObj = userData.user;

      if (!userObj) {
        showToast("User not logged in. Please log in again.", "error");
        setTimeout(()=>{

          window.location.href = 'login/login.html';
        },2000)
        return;
      }
      let imageUrl = null;

  // Agar image select hui hai to upload karo
  if (imageFile) {
    const fileName = `${Date.now()}_${imageFile.name}`;
    const { error: uploadError } = await client
      .storage
      .from('ahmed')
      .upload(`public/${fileName}`, imageFile);

    if (uploadError) {
      showToast('Image upload failed: ' + uploadError.message, 'error');
      return;
    }

    // Public URL //
    const { data: publicData } = client
      .storage
      .from('ahmed')
      .getPublicUrl(`public/${fileName}`);

    imageUrl = publicData.publicUrl;
  }


      if (editId) {
        const { error } = await client
          .from('Postapp')
          .update({ Title: title, Content: content,image_url: imageUrl })
          .eq('id', editId);

        if (!error) {
          showToast('Post updated!', 'success');
          editId = null;
        } else {
          showToast('Failed to update post.', 'error');
        }
      } else {
        const { error } = await client
          .from('Postapp')
          .insert([{ Title: title, Content: content, user_id: userObj.id, image_url: imageUrl }]);

        if (!error) {
          showToast('Post created!', 'success');
        } else {
          showToast('Failed to create post.', 'error');
        }
      }

      form.reset();
      render(userObj.id);
    });
  }
});

async function render(userId) {
  const Card = document.getElementById('card');
  Card.innerHTML = '';

  const { data, error } = await client
    .from('Postapp')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    Card.innerHTML = '<p>❌ Failed to load posts.</p>';
    return;
  }

  data.forEach((post) => {
    const postEl = document.createElement('div');
    postEl.className = 'post-card';

    postEl.innerHTML = `
      <h3>${post.Title}</h3>
      <p style="white-space: pre-wrap; word-wrap: break-word;">${post.Content}</p>
      ${post.image_url ? `<img src="${post.image_url}" alt="Post Image" style="max-width:400px; display:block; margin-top:10px;">` : ''}
      <small>${new Date(post.created_at).toLocaleString()}</small><br/>
      <button onclick="deletePost(${post.id})">🗑 Delete</button>
      <button onclick="startEdit(${post.id}, '${post.Title}', '${post.Content}')">✏️ Edit</button>
      <button onclick="viewPost(${post.id})">🔍 View</button>
    `;

    Card.appendChild(postEl);
  });
}

function startEdit(id, postTitle, postContent) {
  document.getElementById('title').value = postTitle;
  document.getElementById('content').value = postContent;
  editId = id;
}

async function deletePost(id) {
  const { error } = await client
    .from('Postapp')
    .delete()
    .eq('id', id);

  const { data: { user } } = await client.auth.getUser();
  if (!error) {
    showToast('Post deleted!', 'success');
    render(user.id);
  } else {
    showToast('Failed to delete post.', 'error');
  }
}

// =================== PASSWORD RESET ===================
async function resetpassword() {
  let forgetemail = document.getElementById('email').value;
  

  const { error } = await client.auth.resetPasswordForEmail(forgetemail, {
    redirectTo: 'http://127.0.0.1:5500/updatepassword.html',
  });

  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('Password reset email sent! Check your inbox.', 'success');
    setTimeout(() => {
      window.location.href = 'updatepassword.html';
    }, 2000);
  }
}

async function updatepassword() {
  let updatepassword = document.getElementById('new-password').value;

  const { error } = await client.auth.updateUser({ password: updatepassword });

  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('Password updated successfully!', 'success');
    setTimeout(() => {
      window.location.href = 'login/login.html';
    }, 2000);
  }
}

// =================== IMAGE UPLOAD ===================
let imginp = document.getElementById('imageInput');

if(imginp){

  imginp.addEventListener('change', async function () {
    let file = imginp.files[0];
    
    if (!file) {
      showToast('No file selected!', 'error');
      return;
    }
    
    let filename = file.name;
    
    const { error } = await client
    .storage
    .from('ahmed')
    .upload(`public/${filename}`, file, {
      
    });
    
    if (error) {
      showToast('Upload Error: ' + error.message, 'error');
    } else {
      showToast('Upload Successful!', 'success');
    }
  });
}
function viewPost(postId) {
  client
    .from('Postapp')
    .select('*')
    .eq('id', postId)
    .single()
    .then(({ data, error }) => {
      if (error) {
        showToast('Error loading post.', 'error');
        return;
      }
      localStorage.setItem('selectedPost', JSON.stringify(data));
      window.location.href = 'post.html';
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const post = JSON.parse(localStorage.getItem('selectedPost'));
  if (!post) {
    document.getElementById('details').innerHTML = "<p>No post found.</p>";
    return;
  }

  document.getElementById('details').innerHTML = `
    <h3>${post.Title}</h3>
    <p style="white-space: pre-wrap; word-wrap: break-word;">${post.Content}</p>
    ${post.image_url ? `<img src="${post.image_url}" style="max-width:600px;">` : ''}
    <small>${new Date(post.created_at).toLocaleString()}</small>
  `;
});


