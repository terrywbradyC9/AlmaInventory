<%@page language="java" contentType="application/json;charset=UTF-8" %>
<%@ page import="java.util.Scanner,java.io.File,java.util.Map,java.util.HashMap,java.util.Enumeration" %>
<%@ page import="java.net.URL,java.io.BufferedReader,java.io.InputStreamReader,java.net.URLConnection" %>
<%
  String APIKEY="";
  try(Scanner scan = new Scanner(new File("/tmp/local.prop"))){
    while(scan.hasNext()) {
      String s = scan.next();
      if (s.startsWith("ALMA_APIKEY=")) {
        APIKEY=s.substring(12);
      }
    }
  }
  StringBuilder url = new StringBuilder(request.getParameter("apipath"));
  url.append("?apikey="+ APIKEY);
  for(Enumeration e=request.getParameterNames(); e.hasMoreElements();) {
    String s = e.nextElement().toString();
    if (s.equals("apipath")) continue;
    url.append(String.format("&%s=%s", s, request.getParameter(s)));
  }
  StringBuilder resp = new StringBuilder();
  URLConnection conn = new URL(url.toString()).openConnection();
  conn.setRequestProperty("Accept","application/json");
  try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"))) {
    for (String line; (line = reader.readLine()) != null;) {
        resp.append(line);
    }
  }
%>
<%=resp%>
