//! Native embedded desktop window for Badrock using Tao and Wry (WebView2).
//! Runs directly in-process without launching any external browser.

use std::path::PathBuf;
use tao::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::WindowBuilder,
};
use wry::webview::{WebContext, WebViewBuilder};

pub fn run_desktop_window(url: &str) -> Result<(), Box<dyn std::error::Error>> {
    let event_loop = EventLoop::new();

    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
    let webview_dir = PathBuf::from(local_app_data).join("Badrock").join("WebView2");
    let _ = std::fs::create_dir_all(&webview_dir);
    let mut web_context = WebContext::new(Some(webview_dir));

    let window = WindowBuilder::new()
        .with_title("Badrock")
        .with_inner_size(tao::dpi::LogicalSize::new(1280.0, 800.0))
        .with_min_inner_size(tao::dpi::LogicalSize::new(800.0, 600.0))
        .build(&event_loop)?;

    let _webview = WebViewBuilder::new(window)?
        .with_web_context(&mut web_context)
        .with_url(url)?
        .build()?;

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        match event {
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                *control_flow = ControlFlow::Exit;
            }
            _ => (),
        }
    });
}
