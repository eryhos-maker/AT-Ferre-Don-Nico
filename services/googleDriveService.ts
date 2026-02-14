// CLIENT CONFIGURATION
// IMPORTANTE: Reemplaza estos valores con los de tu proyecto en Google Cloud Console
const CLIENT_ID = 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com'; 
const API_KEY = 'TU_API_KEY_AQUI'; 

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Initialize gapi (Google API Client)
export const initGapiClient = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window.gapi === 'undefined') {
        console.warn("Google Scripts not loaded yet");
        resolve(); // Soft fail
        return;
    }
    
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        resolve();
      } catch (err) {
        console.error("Error initializing GAPI Client", err);
        reject(err);
      }
    });
  });
};

// Initialize Identity Services (GIS)
export const initGisClient = (): void => {
  if (typeof window.google === 'undefined') return;

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // defined at request time
  });
  gisInited = true;
};

// Main function to check if initialized
export const checkGoogleInit = async () => {
    if (!gapiInited) await initGapiClient();
    if (!gisInited) initGisClient();
    return gapiInited && gisInited;
};

// Function to handle the actual upload process
export const uploadFileToDrive = async (file: File): Promise<string | null> => {
    // 1. Ensure initialized
    await checkGoogleInit();

    return new Promise((resolve, reject) => {
        // 2. Request Access Token from User
        tokenClient.callback = async (resp: any) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }

            // Set token for GAPI client usage (required for permissions.create)
            if (window.gapi.client) {
              window.gapi.client.setToken(resp);
            }
            
            // 3. Upload File Logic
            try {
                // Use token from response directly
                const accessToken = resp.access_token;
                
                const metadata = {
                    'name': file.name,
                    'mimeType': file.type,
                    // Optional: 'parents': ['FOLDER_ID'] if you want a specific folder
                };

                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', file);

                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink', {
                    method: 'POST',
                    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                    body: form,
                });
                
                const data = await response.json();
                
                if (data.id) {
                    // 4. Make it readable by anyone with the link (Optional, usually good for evidence viewing)
                    // If you want it private to the user's drive, skip this.
                    if (window.gapi.client && window.gapi.client.drive) {
                      await window.gapi.client.drive.permissions.create({
                          fileId: data.id,
                          resource: {
                              role: 'reader',
                              type: 'anyone',
                          },
                      });
                    }
                    
                    resolve(data.webViewLink);
                } else {
                    reject("Failed to get file ID from Drive");
                }

            } catch (error) {
                console.error("Upload error", error);
                reject(error);
            }
        };

        // Trigger the OAuth Popup
        // Check if we already have a valid token to avoid prompt if possible?
        if (window.gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            tokenClient.requestAccessToken({prompt: ''});
        }
    });
};