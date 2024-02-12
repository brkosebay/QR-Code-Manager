const { exec, spawn} = require('child_process');
const fs = require('fs');
const { ipcRenderer } = require('electron');

let dockerComposePath = '../backend'; // Replace with the actual path

const execOptions = {
  shell:true,
  cwd: dockerComposePath
};


document.getElementById('start-btn').addEventListener('click', () => {
    console.log(execOptions);
    exec('docker-compose up -d', execOptions, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    
    console.log(`Stdout: ${stdout}`);
  });
});

document.getElementById('rebuild-btn').addEventListener('click', () => {
  const dockerRebuildProcess = spawn('docker-compose', ['up', '--build', '-d'], execOptions);

  dockerRebuildProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
      document.getElementById('rebuild-status').innerText = `Rebuilding container...\n${data}`;
  });

  dockerRebuildProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
      document.getElementById('rebuild-status').innerText = `Error in rebuilding container.\n${data}`;
  });

  dockerRebuildProcess.on('close', (code) => {
      if (code === 0) {
          document.getElementById('rebuild-status').innerText = 'Container rebuild completed successfully.';
      } else {
          document.getElementById('rebuild-status').innerText = `Rebuild process exited with code ${code}`;
      }
  });
});


document.getElementById('stop-btn').addEventListener('click', () => {
    exec('docker-compose stop', execOptions, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Stdout: ${stdout}`);
  });
});

document.getElementById('rebuild-database-btn').addEventListener('click', () => {
  ipcRenderer.send('confirm-rebuild');
});

document.getElementById('backend-select').addEventListener('click', () => {
    ipcRenderer.send('open-folder-dialog');
  });

ipcRenderer.on('selected-folder', (event, path) => {
    console.log('Selected folder:', path);
    const dockerComposeFile = path + '/docker-compose.yml';

    // Check if docker-compose.yml exists in the selected path
    if (fs.existsSync(dockerComposeFile)) {
        dockerComposePath = path;

        execOptions.cwd = dockerComposePath;
        document.getElementById('start-btn').disabled = false;
        document.getElementById('rebuild-btn').disabled = false;
        document.getElementById('stop-btn').disabled = false;
        document.getElementById('rebuild-database-btn').disabled = false;
        document.getElementById('path-selection-message').innerText = `Selected path: ${path}`;
    } else {
        document.getElementById('path-selection-message').innerText = 'Invalid path: No docker-compose.yml found. Please select the correct path.';
    }
});

ipcRenderer.on('confirm-rebuild-reply', (event, shouldRebuild) => {
  if (shouldRebuild) {
      // User confirmed the action
      startRebuildDatabase();
  } else {
      // User cancelled the action
      console.log('Rebuild cancelled by the user.');
  }
});

function startRebuildDatabase() {
   // Indicate that the rebuild process has started
   document.getElementById('rebuild-status').innerText = 'Rebuilding database...';

   exec('docker-compose exec app npm run rebuild', execOptions, (error, stdout, stderr) => {
       if (error) {
           console.error(`Error: ${error.message}`);
           document.getElementById('rebuild-status').innerText = 'Error in rebuilding database.';
           return;
       }
       if (stderr) {
           console.error(`Stderr: ${stderr}`);
           document.getElementById('rebuild-status').innerText = 'Error in rebuilding database.';
           return;
       }

       console.log(`Stdout: ${stdout}`);
       // Update the UI to indicate completion
       document.getElementById('rebuild-status').innerText = 'Database rebuild completed successfully.';
   });
}

function checkDockerStatus() {
    exec('docker ps -q', {shell:true}, (error, stdout, stderr) => {
        if (error || stderr) {
            console.error(`Error: ${error || stderr}`);
            document.getElementById('docker-status-indicator').innerText = 'Error';
            return;
        }

        if (stdout.trim()) {
            // If there is output, some containers are running
            document.getElementById('docker-status-indicator').innerText = 'Running';
            document.getElementById('docker-status-indicator').classList.add('docker-running');
            document.getElementById('docker-status-indicator').classList.remove('docker-stopped');
        } else {
            // No output means no containers are running
            document.getElementById('docker-status-indicator').innerText = 'Stopped';
            document.getElementById('docker-status-indicator').classList.add('docker-stopped');
            document.getElementById('docker-status-indicator').classList.remove('docker-running');
        }
    });
}



setInterval(checkDockerStatus, 5000); // Check every 5 seconds


