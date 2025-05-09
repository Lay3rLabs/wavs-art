use anyhow::Result;
use serde::Deserialize;
use std::{
    fs::File,
    io::{Read, Write},
};
use wstd::http::{IntoBody, Request};
use wstd::io::AsyncRead;

use cid::Cid;
use std::str::FromStr;

/// Uploads a file using multipart request to IPFS
async fn upload_to_ipfs(file_path: &str, name: &str, ipfs_url: &str, api_key: &str) -> Result<Cid> {
    eprintln!("Uploading file to IPFS: {}", file_path);

    let mut file = File::open(file_path)?;
    let mut file_bytes = Vec::new();
    file.read_to_end(&mut file_bytes)?;

    // define multipart request boundary
    let boundary = "----RustBoundary";
    // construct the body
    let body = format!(
        "--{}\r\n\
        Content-Disposition: form-data; name=\"file\"; filename=\"{}\"\r\n\
        Content-Type: application/octet-stream\r\n\r\n",
        boundary, name
    );

    let mut request_body = body.into_bytes();
    request_body.extend_from_slice(&file_bytes);
    request_body.extend_from_slice(format!("\r\n--{}\r\n", boundary).as_bytes());

    // Add network parameter
    let network_part = format!(
        "Content-Disposition: form-data; name=\"network\"\r\n\r\n\
        public\r\n\
        --{}--\r\n",
        boundary
    );
    request_body.extend_from_slice(network_part.as_bytes());

    let request = Request::post(ipfs_url)
        .header("Authorization", &format!("Bearer {}", api_key))
        .header("Content-Type", &format!("multipart/form-data; boundary={}", boundary))
        .body(request_body.into_body())?;

    let mut response = wstd::http::Client::new().send(request).await?;

    if response.status().is_success() {
        let mut body_buf = Vec::new();
        response.body_mut().read_to_end(&mut body_buf).await?;

        // Log the raw response for debugging
        let response_str = std::str::from_utf8(&body_buf)
            .map_err(|e| anyhow::anyhow!("Failed to convert response to string: {}", e))?;
        eprintln!("IPFS API Response: {}", response_str);

        // Parse using Pinata's response format (capitalized fields)
        #[derive(Debug, Deserialize)]
        struct PinataResponse {
            data: PinataData,
        }

        #[derive(Debug, Deserialize)]
        struct PinataData {
            cid: String,
        }

        let hash = match serde_json::from_slice::<PinataResponse>(&body_buf) {
            Ok(resp) => resp.data.cid,
            Err(_) => {
                return Err(anyhow::anyhow!(
                    "Could not extract hash from response: {}",
                    response_str
                ));
            }
        };

        // Return the hash directly
        decode_ipfs_cid(&hash).map_err(|e| anyhow::anyhow!("Failed to decode IPFS CID: {}", e))
    } else {
        let mut body_buf = Vec::new();
        response.body_mut().read_to_end(&mut body_buf).await?;
        let error_body = std::str::from_utf8(&body_buf).unwrap_or("unable to read error body");
        Err(anyhow::anyhow!(
            "Failed to upload to IPFS. Status: {:?}, Body: {}",
            response.status(),
            error_body
        ))
    }
}

/// Uploads JSON data directly to IPFS and returns the CID
pub async fn upload_json_to_ipfs(
    json_data: &str,
    name: &str,
    ipfs_url: &str,
    api_key: &str,
) -> Result<Cid> {
    // Create a temporary file to store the JSON data
    let temp_path = "/tmp/ipfs_data.json";

    eprintln!("Temp path {}", temp_path);

    // Ensure the /tmp directory exists
    std::fs::create_dir_all("/tmp")
        .map_err(|e| anyhow::anyhow!("Failed to create /tmp directory: {}", e))?;

    // Write JSON to temporary file
    let mut file = File::create(temp_path)?;
    file.write_all(json_data.as_bytes())?;

    // Upload the file
    let hash = upload_to_ipfs(temp_path, name, ipfs_url, api_key).await?;

    // Clean up the temporary file
    delete_file(temp_path)?;

    // Return the IPFS URI
    Ok(hash)
}

/// Uploads NFT content (metadata and/or image) to IPFS
/// Returns the IPFS URI for the content
pub async fn upload_nft_content(
    content_type: &str,
    content: &[u8],
    ipfs_url: &str,
    api_key: &str,
) -> Result<String> {
    // Determine if this is JSON metadata or an image
    let ipfs_uri = if content_type.contains("json") {
        // It's JSON metadata
        let json_str = std::str::from_utf8(content)
            .map_err(|e| anyhow::anyhow!("Failed to convert JSON bytes to string: {}", e))?;

        // Upload the JSON and return the IPFS URI
        get_ipfs_url(
            &upload_json_to_ipfs(json_str, "metadata.json", ipfs_url, api_key).await?,
            None,
        )
    } else {
        // It's an image or other binary content
        let extension = match content_type {
            "image/png" => "png",
            "image/jpeg" => "jpg",
            "image/gif" => "gif",
            "image/svg+xml" => "svg",
            _ => "bin", // Default extension for unknown types
        };

        let filename = format!("nft_image.{}", extension);

        // Upload the image and return the IPFS URI
        upload_image_to_ipfs(content, &filename, ipfs_url, api_key).await?
    };

    // Log the upload
    println!("Uploaded to IPFS with URI: {}", ipfs_uri);

    // Return IPFS URI
    Ok(ipfs_uri)
}

/// Uploads an image to IPFS and returns the URI
pub async fn upload_image_to_ipfs(
    image_data: &[u8],
    filename: &str,
    ipfs_url: &str,
    api_key: &str,
) -> Result<String> {
    // Create a temporary file to store the image data
    let temp_path = format!("/tmp/{}", filename);

    // Ensure the /tmp directory exists
    std::fs::create_dir_all("/tmp")
        .map_err(|e| anyhow::anyhow!("Failed to create /tmp directory: {}", e))?;

    // Write image data to temporary file
    let mut file = File::create(&temp_path)?;
    file.write_all(image_data)?;

    // Upload the file
    let cid = upload_to_ipfs(&temp_path, filename, ipfs_url, api_key).await?;

    // Clean up the temporary file
    delete_file(&temp_path)?;

    // Return the IPFS URI
    Ok(get_ipfs_url(&cid, Some(filename)))
}

/// Get IPFS URL from CID
/// If filename is provided, constructs a URL that points to a file within a directory
pub fn get_ipfs_url(cid: &Cid, filename: Option<&str>) -> String {
    match filename {
        Some(name) => format!("ipfs://{}/{}", cid.to_string(), name),
        None => format!("ipfs://{}", cid.to_string()),
    }
}

/// Delete a file from the filesystem
pub fn delete_file(file_path: &str) -> Result<()> {
    std::fs::remove_file(file_path)?;
    println!("File deleted successfully: {}", file_path);
    Ok(())
}

pub fn decode_ipfs_cid(cid_str: &str) -> Result<Cid, String> {
    // Check if the string is a v0 CID (starts with "Qm" and has length 46).
    if cid_str.starts_with("Qm") && cid_str.len() == 46 {
        // Decode as base58
        let decoded = bs58::decode(cid_str).into_vec().map_err(|e| e.to_string())?;
        // Attempt to construct a Cid from the decoded bytes
        let cid = Cid::try_from(decoded).map_err(|e| e.to_string())?;
        Ok(cid)
    } else {
        // Attempt to construct a Cid from the decoded bytes
        let cid = Cid::from_str(cid_str).map_err(|e| e.to_string())?;
        Ok(cid)
    }
}
