package com.badrock.notes;

import android.content.Context;
import android.content.res.AssetManager;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.regex.*;

public class LocalServer {
    private final Context context;
    private final File vaultDir;
    private ServerSocket serverSocket;
    private Thread serverThread;
    private volatile boolean running = false;
    private int port = 5176;

    public LocalServer(Context context) {
        this.context = context;
        File baseDir = context.getExternalFilesDir(null);
        if (baseDir == null) {
            baseDir = context.getFilesDir();
        }
        this.vaultDir = new File(baseDir, "vault");
        if (!this.vaultDir.exists()) {
            this.vaultDir.mkdirs();
            createInitialNotes();
        }
    }

    private void createInitialNotes() {
        try {
            File welcome = new File(vaultDir, "Добро пожаловать.md");
            String welcomeContent = "# Добро пожаловать в Badrock Notes!\n\n"
                    + "Badrock — это локальное приложение для ведения заметок в формате Markdown.\n\n"
                    + "## Возможности:\n"
                    + "- 📝 Быстрый редактор Markdown с живым предпросмотром\n"
                    + "- 🔗 Двусторонние связи: пишите `[[Имя заметки]]` для связывания\n"
                    + "- 🕸 Интерактивный интерактивный граф заметок\n"
                    + "- 🏷 Поддержка тегов `#тег`\n"
                    + "- ☁️ Синхронизация с Google Диском\n\n"
                    + "Создайте свою первую заметку через кнопку в левой панели!\n";
            writeFile(welcome, welcomeContent);
        } catch (Exception ignored) {}
    }

    public synchronized void start() throws IOException {
        if (running) return;
        try {
            serverSocket = new ServerSocket(5176, 50, InetAddress.getByName("127.0.0.1"));
            port = 5176;
        } catch (Exception e) {
            serverSocket = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
            port = serverSocket.getLocalPort();
        }
        running = true;

        serverThread = new Thread(() -> {
            while (running && !serverSocket.isClosed()) {
                try {
                    Socket client = serverSocket.accept();
                    new Thread(() -> handleConnection(client)).start();
                } catch (IOException e) {
                    if (!running) break;
                }
            }
        });
        serverThread.setName("Badrock-HttpServer");
        serverThread.setDaemon(true);
        serverThread.start();
    }

    public synchronized void stop() {
        running = false;
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (Exception ignored) {}
    }

    public int getPort() {
        return port;
    }

    public String getBaseUrl() {
        return "http://127.0.0.1:" + port + "/";
    }

    private void handleConnection(Socket client) {
        try (client;
             InputStream in = client.getInputStream();
             OutputStream out = client.getOutputStream()) {

            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            String reqLine = reader.readLine();
            if (reqLine == null || reqLine.trim().isEmpty()) return;

            String[] parts = reqLine.split(" ");
            if (parts.length < 2) return;
            String method = parts[0];
            String rawUri = parts[1];

            // Parse headers
            Map<String, String> headers = new HashMap<>();
            String line;
            int contentLength = 0;
            while ((line = reader.readLine()) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    String k = line.substring(0, colon).trim().toLowerCase(Locale.US);
                    String v = line.substring(colon + 1).trim();
                    headers.put(k, v);
                    if ("content-length".equals(k)) {
                        try { contentLength = Integer.parseInt(v); } catch (Exception ignored) {}
                    }
                }
            }

            // Read body
            String body = "";
            if (contentLength > 0) {
                char[] buf = new char[contentLength];
                int read = 0;
                while (read < contentLength) {
                    int r = reader.read(buf, read, contentLength - read);
                    if (r < 0) break;
                    read += r;
                }
                body = new String(buf, 0, read);
            }

            // Route request
            String path = rawUri;
            String query = "";
            int qIdx = rawUri.indexOf('?');
            if (qIdx >= 0) {
                path = rawUri.substring(0, qIdx);
                query = rawUri.substring(qIdx + 1);
            }

            if (path.startsWith("/api/")) {
                handleApi(method, path, query, body, out);
            } else {
                handleStatic(path, out);
            }

        } catch (Exception ignored) {}
    }

    private void handleStatic(String path, OutputStream out) throws IOException {
        String assetPath = path;
        if (assetPath.equals("/") || assetPath.isEmpty()) {
            assetPath = "/index.html";
        }
        if (assetPath.startsWith("/")) {
            assetPath = assetPath.substring(1);
        }

        AssetManager am = context.getAssets();
        String fullAsset = "public/" + assetPath;

        try (InputStream is = am.open(fullAsset)) {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int r;
            while ((r = is.read(buf)) != -1) {
                bos.write(buf, 0, r);
            }
            byte[] data = bos.toByteArray();
            String mime = getMimeType(assetPath);
            sendResponse(out, 200, mime, data);
        } catch (FileNotFoundException e) {
            // SPA fallback to index.html
            try (InputStream is = am.open("public/index.html")) {
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int r;
                while ((r = is.read(buf)) != -1) {
                    bos.write(buf, 0, r);
                }
                sendResponse(out, 200, "text/html; charset=utf-8", bos.toByteArray());
            } catch (Exception ex) {
                sendError(out, 404, "Not Found");
            }
        }
    }

    private void handleApi(String method, String path, String query, String body, OutputStream out) throws IOException {
        Map<String, String> qMap = parseQuery(query);

        try {
            switch (path) {
                case "/api/vault/info": {
                    int count = countNotes(vaultDir);
                    String json = "{\"name\":\"" + escapeJson(vaultDir.getName()) + "\",\"dir\":\"" + escapeJson(vaultDir.getAbsolutePath()) + "\",\"totalNotes\":" + count + "}";
                    sendJson(out, 200, json);
                    break;
                }
                case "/api/vault/tree": {
                    String json = buildVaultTreeJson(vaultDir);
                    sendJson(out, 200, json);
                    break;
                }
                case "/api/vault/select": {
                    sendJson(out, 200, "{\"ok\":true}");
                    break;
                }
                case "/api/note": {
                    if ("POST".equalsIgnoreCase(method)) {
                        handleWriteNote(body, out);
                    } else {
                        handleGetNote(qMap.get("path"), out);
                    }
                    break;
                }
                case "/api/note/write":
                case "/api/note/create": {
                    handleWriteNote(body, out);
                    break;
                }
                case "/api/note/rename": {
                    String p = getJsonField(body, "path");
                    String np = getJsonField(body, "newPath");
                    if (p != null && np != null) {
                        File oldF = getSafeFile(p);
                        File newF = getSafeFile(np);
                        if (oldF.exists()) {
                            newF.getParentFile().mkdirs();
                            oldF.renameTo(newF);
                        }
                    }
                    sendJson(out, 200, "{\"ok\":true}");
                    break;
                }
                case "/api/note/delete": {
                    String p = getJsonField(body, "path");
                    if (p != null) {
                        File f = getSafeFile(p);
                        if (f.exists()) f.delete();
                    }
                    sendJson(out, 200, "{\"ok\":true}");
                    break;
                }
                case "/api/note/duplicate": {
                    String p = getJsonField(body, "path");
                    if (p != null) {
                        File f = getSafeFile(p);
                        if (f.exists()) {
                            String name = f.getName();
                            String ext = "";
                            int dot = name.lastIndexOf('.');
                            if (dot > 0) {
                                ext = name.substring(dot);
                                name = name.substring(0, dot);
                            }
                            File dup = new File(f.getParentFile(), name + " (копия)" + ext);
                            writeFile(dup, readFile(f));
                        }
                    }
                    sendJson(out, 200, "{\"ok\":true}");
                    break;
                }
                case "/api/note/daily": {
                    String date = getJsonField(body, "date");
                    if (date == null || date.isEmpty()) {
                        date = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
                    }
                    String rel = date + ".md";
                    File f = getSafeFile(rel);
                    if (!f.exists()) {
                        writeFile(f, "# Заметка за " + date + "\n\n- \n");
                    }
                    sendJson(out, 200, "{\"path\":\"" + escapeJson(rel) + "\"}");
                    break;
                }
                case "/api/folder/create": {
                    String p = getJsonField(body, "path");
                    if (p != null) {
                        File dir = getSafeFile(p);
                        dir.mkdirs();
                    }
                    sendJson(out, 200, "{\"ok\":true}");
                    break;
                }
                case "/api/folder/rename": {
                    String p = getJsonField(body, "path");
                    String np = getJsonField(body, "newPath");
                    if (p != null && np != null) {
                        File oldD = getSafeFile(p);
                        File newD = getSafeFile(np);
                        if (oldD.exists()) {
                            newD.getParentFile().mkdirs();
                            oldD.renameTo(newD);
                        }
                    }
                    sendJson(out, 200, "{\"ok\":true}");
                    break;
                }
                case "/api/folder/delete": {
                    String p = getJsonField(body, "path");
                    if (p != null) {
                        File dir = getSafeFile(p);
                        deleteRecursively(dir);
                    }
                    sendJson(out, 200, "{\"ok\":true}");
                    break;
                }
                case "/api/search": {
                    String q = qMap.getOrDefault("q", "").toLowerCase(Locale.ROOT);
                    String results = searchNotes(q);
                    sendJson(out, 200, results);
                    break;
                }
                case "/api/tags": {
                    String tagsJson = extractTags();
                    sendJson(out, 200, tagsJson);
                    break;
                }
                case "/api/backlinks": {
                    String p = qMap.getOrDefault("path", "");
                    String blJson = extractBacklinks(p);
                    sendJson(out, 200, blJson);
                    break;
                }
                case "/api/graph": {
                    String graphJson = buildGraph();
                    sendJson(out, 200, graphJson);
                    break;
                }
                case "/api/resolve": {
                    String target = qMap.getOrDefault("target", "");
                    String pathRes = resolveLink(target);
                    sendJson(out, 200, "{\"path\":\"" + escapeJson(pathRes) + "\"}");
                    break;
                }
                case "/api/random": {
                    List<File> all = getAllMarkdownFiles(vaultDir);
                    if (!all.isEmpty()) {
                        File r = all.get(new Random().nextInt(all.size()));
                        String rel = getRelativePath(vaultDir, r);
                        sendJson(out, 200, "{\"path\":\"" + escapeJson(rel) + "\"}");
                    } else {
                        sendJson(out, 200, "{\"path\":\"\"}");
                    }
                    break;
                }
                case "/api/sync/status": {
                    sendJson(out, 200, "{\"configured\":false,\"authorized\":false,\"autoSync\":false,\"lastStatus\":\"Локальное хранилище Android\"}");
                    break;
                }
                case "/api/sync/config":
                case "/api/sync/run":
                case "/api/sync/disconnect": {
                    sendJson(out, 200, "{\"ok\":true,\"message\":\"Синхронизация Google Диска на мобильном устройстве\"}");
                    break;
                }
                default: {
                    sendError(out, 404, "Endpoint Not Found");
                    break;
                }
            }
        } catch (Exception e) {
            sendError(out, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    private void handleGetNote(String path, OutputStream out) throws IOException {
        if (path == null || path.isEmpty()) {
            sendError(out, 400, "Path missing");
            return;
        }
        File f = getSafeFile(path);
        if (!f.exists()) {
            sendError(out, 404, "Note not found");
            return;
        }
        String content = readFile(f);
        String name = f.getName();
        if (name.endsWith(".md")) name = name.substring(0, name.length() - 3);

        String json = "{\"path\":\"" + escapeJson(path) + "\",\"name\":\"" + escapeJson(name)
                + "\",\"content\":\"" + escapeJson(content) + "\",\"mtime\":" + f.lastModified()
                + ",\"size\":" + f.length() + "}";
        sendJson(out, 200, json);
    }

    private void handleWriteNote(String body, OutputStream out) throws IOException {
        String path = getJsonField(body, "path");
        String content = getJsonField(body, "content");
        if (path == null || path.isEmpty()) {
            sendError(out, 400, "Path required");
            return;
        }
        if (content == null) content = "";

        File f = getSafeFile(path);
        f.getParentFile().mkdirs();
        writeFile(f, content);

        sendJson(out, 200, "{\"ok\":true,\"path\":\"" + escapeJson(path) + "\"}");
    }

    private File getSafeFile(String relative) {
        String clean = relative.replace('\\', '/').replaceAll("/+", "/");
        if (clean.startsWith("/")) clean = clean.substring(1);
        return new File(vaultDir, clean);
    }

    private String buildVaultTreeJson(File dir) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"name\":\"").append(escapeJson(dir.getName())).append("\",\"type\":\"folder\",\"path\":\"")
          .append(escapeJson(getRelativePath(vaultDir, dir))).append("\",\"children\":[");

        File[] files = dir.listFiles();
        if (files != null) {
            Arrays.sort(files, (a, b) -> {
                if (a.isDirectory() != b.isDirectory()) return a.isDirectory() ? -1 : 1;
                return a.getName().compareToIgnoreCase(b.getName());
            });

            boolean first = true;
            for (File f : files) {
                if (f.getName().startsWith(".")) continue;
                if (!first) sb.append(",");
                first = false;
                if (f.isDirectory()) {
                    sb.append(buildVaultTreeJson(f));
                } else if (f.getName().endsWith(".md")) {
                    String name = f.getName();
                    if (name.endsWith(".md")) name = name.substring(0, name.length() - 3);
                    sb.append("{\"name\":\"").append(escapeJson(name))
                      .append("\",\"type\":\"file\",\"path\":\"")
                      .append(escapeJson(getRelativePath(vaultDir, f)))
                      .append("\",\"mtime\":").append(f.lastModified())
                      .append(",\"size\":").append(f.length()).append("}");
                }
            }
        }
        sb.append("]}");
        return sb.toString();
    }

    private String searchNotes(String q) {
        List<File> all = getAllMarkdownFiles(vaultDir);
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        for (File f : all) {
            String content = readFile(f);
            String name = f.getName();
            if (name.toLowerCase(Locale.ROOT).contains(q) || content.toLowerCase(Locale.ROOT).contains(q)) {
                if (!first) sb.append(",");
                first = false;
                sb.append("{\"path\":\"").append(escapeJson(getRelativePath(vaultDir, f)))
                  .append("\",\"name\":\"").append(escapeJson(name))
                  .append("\",\"snippet\":\"").append(escapeJson(makeSnippet(content, q)))
                  .append("\"}");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    private String extractTags() {
        List<File> all = getAllMarkdownFiles(vaultDir);
        Map<String, Integer> tagCounts = new HashMap<>();
        Pattern tagPat = Pattern.compile("(?:^|\\s)#([a-zA-Z0-9_а-яА-ЯёЁ\\-]+)");

        for (File f : all) {
            String text = readFile(f);
            Matcher m = tagPat.matcher(text);
            Set<String> fileTags = new HashSet<>();
            while (m.find()) {
                fileTags.add(m.group(1));
            }
            for (String tag : fileTags) {
                tagCounts.put(tag, tagCounts.getOrDefault(tag, 0) + 1);
            }
        }

        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        for (Map.Entry<String, Integer> e : tagCounts.entrySet()) {
            if (!first) sb.append(",");
            first = false;
            sb.append("{\"tag\":\"").append(escapeJson(e.getKey())).append("\",\"count\":").append(e.getValue()).append("}");
        }
        sb.append("]");
        return sb.toString();
    }

    private String extractBacklinks(String targetPath) {
        String baseName = new File(targetPath).getName();
        if (baseName.endsWith(".md")) baseName = baseName.substring(0, baseName.length() - 3);

        List<File> all = getAllMarkdownFiles(vaultDir);
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;

        for (File f : all) {
            String rel = getRelativePath(vaultDir, f);
            if (rel.equalsIgnoreCase(targetPath)) continue;
            String text = readFile(f);
            if (text.contains("[[" + baseName + "]]") || text.contains("[[" + baseName + "|")) {
                if (!first) sb.append(",");
                first = false;
                sb.append("{\"path\":\"").append(escapeJson(rel)).append("\",\"name\":\"")
                  .append(escapeJson(f.getName())).append("\"}");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    private String buildGraph() {
        List<File> all = getAllMarkdownFiles(vaultDir);
        StringBuilder nodes = new StringBuilder("[");
        StringBuilder links = new StringBuilder("[");
        boolean firstN = true;
        boolean firstL = true;

        Map<String, String> nameToPath = new HashMap<>();
        for (File f : all) {
            String rel = getRelativePath(vaultDir, f);
            String name = f.getName();
            if (name.endsWith(".md")) name = name.substring(0, name.length() - 3);
            nameToPath.put(name.toLowerCase(Locale.ROOT), rel);

            if (!firstN) nodes.append(",");
            firstN = false;
            nodes.append("{\"id\":\"").append(escapeJson(rel)).append("\",\"title\":\"")
                 .append(escapeJson(name)).append("\"}");
        }

        Pattern linkPat = Pattern.compile("\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]");
        for (File f : all) {
            String sourceRel = getRelativePath(vaultDir, f);
            String text = readFile(f);
            Matcher m = linkPat.matcher(text);
            while (m.find()) {
                String targetName = m.group(1).trim().toLowerCase(Locale.ROOT);
                String targetRel = nameToPath.get(targetName);
                if (targetRel != null) {
                    if (!firstL) links.append(",");
                    firstL = false;
                    links.append("{\"source\":\"").append(escapeJson(sourceRel)).append("\",\"target\":\"")
                         .append(escapeJson(targetRel)).append("\"}");
                }
            }
        }
        nodes.append("]");
        links.append("]");
        return "{\"nodes\":" + nodes + ",\"links\":" + links + "}";
    }

    private String resolveLink(String target) {
        String clean = target.trim();
        List<File> all = getAllMarkdownFiles(vaultDir);
        for (File f : all) {
            String name = f.getName();
            if (name.equalsIgnoreCase(clean) || name.equalsIgnoreCase(clean + ".md")) {
                return getRelativePath(vaultDir, f);
            }
        }
        return clean.endsWith(".md") ? clean : clean + ".md";
    }

    private int countNotes(File dir) {
        int count = 0;
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) count += countNotes(f);
                else if (f.getName().endsWith(".md")) count++;
            }
        }
        return count;
    }

    private List<File> getAllMarkdownFiles(File dir) {
        List<File> res = new ArrayList<>();
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory() && !f.getName().startsWith(".")) {
                    res.addAll(getAllMarkdownFiles(f));
                } else if (f.getName().endsWith(".md")) {
                    res.add(f);
                }
            }
        }
        return res;
    }

    private String getRelativePath(File base, File f) {
        String bp = base.getAbsolutePath().replace('\\', '/');
        String fp = f.getAbsolutePath().replace('\\', '/');
        if (fp.startsWith(bp)) {
            String r = fp.substring(bp.length());
            if (r.startsWith("/")) r = r.substring(1);
            return r;
        }
        return f.getName();
    }

    private String makeSnippet(String text, String q) {
        if (q.isEmpty()) return text.substring(0, Math.min(text.length(), 100));
        int idx = text.toLowerCase(Locale.ROOT).indexOf(q);
        if (idx < 0) return text.substring(0, Math.min(text.length(), 100));
        int start = Math.max(0, idx - 40);
        int end = Math.min(text.length(), idx + q.length() + 60);
        return (start > 0 ? "..." : "") + text.substring(start, end) + (end < text.length() ? "..." : "");
    }

    private void deleteRecursively(File f) {
        if (f.isDirectory()) {
            File[] files = f.listFiles();
            if (files != null) {
                for (File c : files) deleteRecursively(c);
            }
        }
        f.delete();
    }

    private String readFile(File f) {
        try (FileInputStream fis = new FileInputStream(f);
             ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096];
            int r;
            while ((r = fis.read(buf)) != -1) bos.write(buf, 0, r);
            return bos.toString("UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    private void writeFile(File f, String content) {
        try (FileOutputStream fos = new FileOutputStream(f)) {
            fos.write(content.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {}
    }

    private void sendJson(OutputStream out, int code, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        sendResponse(out, code, "application/json; charset=utf-8", bytes);
    }

    private void sendResponse(OutputStream out, int code, String mime, byte[] data) throws IOException {
        String statusText = code == 200 ? "OK" : (code == 404 ? "Not Found" : "Error");
        String headers = "HTTP/1.1 " + code + " " + statusText + "\r\n"
                + "Content-Type: " + mime + "\r\n"
                + "Content-Length: " + data.length + "\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Access-Control-Allow-Headers: *\r\n"
                + "Access-Control-Allow-Methods: *\r\n"
                + "Connection: close\r\n\r\n";
        out.write(headers.getBytes(StandardCharsets.UTF_8));
        out.write(data);
        out.flush();
    }

    private void sendError(OutputStream out, int code, String msg) throws IOException {
        String json = "{\"error\":\"" + escapeJson(msg) + "\"}";
        sendJson(out, code, json);
    }

    private String getMimeType(String path) {
        if (path.endsWith(".html")) return "text/html; charset=utf-8";
        if (path.endsWith(".css")) return "text/css; charset=utf-8";
        if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (path.endsWith(".json")) return "application/json; charset=utf-8";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".ico")) return "image/x-icon";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    private Map<String, String> parseQuery(String q) {
        Map<String, String> map = new HashMap<>();
        if (q == null || q.isEmpty()) return map;
        String[] pairs = q.split("&");
        for (String p : pairs) {
            int eq = p.indexOf('=');
            if (eq > 0) {
                try {
                    String k = URLDecoder.decode(p.substring(0, eq), "UTF-8");
                    String v = URLDecoder.decode(p.substring(eq + 1), "UTF-8");
                    map.put(k, v);
                } catch (Exception ignored) {}
            }
        }
        return map;
    }

    private String getJsonField(String json, String field) {
        if (json == null) return null;
        Pattern p = Pattern.compile("\"" + Pattern.quote(field) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"");
        Matcher m = p.matcher(json);
        if (m.find()) {
            return unescapeJson(m.group(1));
        }
        return null;
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 32) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        return sb.toString();
    }

    private String unescapeJson(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '\\' && i + 1 < s.length()) {
                char next = s.charAt(++i);
                switch (next) {
                    case '"': sb.append('"'); break;
                    case '\\': sb.append('\\'); break;
                    case 'n': sb.append('\n'); break;
                    case 'r': sb.append('\r'); break;
                    case 't': sb.append('\t'); break;
                    case 'b': sb.append('\b'); break;
                    case 'f': sb.append('\f'); break;
                    case 'u':
                        if (i + 4 < s.length()) {
                            try {
                                int code = Integer.parseInt(s.substring(i + 1, i + 5), 16);
                                sb.append((char) code);
                                i += 4;
                            } catch (Exception e) {
                                sb.append("\\u");
                            }
                        } else {
                            sb.append("\\u");
                        }
                        break;
                    default: sb.append(next); break;
                }
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
