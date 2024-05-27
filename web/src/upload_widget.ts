import * as dialog_widget from "./dialog_widget";
import { Uppy, UppyFile } from "@uppy/core";
import type { DashboardOptions } from "@uppy/dashboard";
import Dashboard from "@uppy/dashboard";
import type { EditorOptions } from "@uppy/image-editor";
import Editor from "@uppy/image-editor";
import $ from "jquery";

import { $t, $t_html } from "./i18n";
import * as settings_data from "./settings_data";
import ImageEditor from "@uppy/image-editor";

// Define types for the upload widget and upload function
export type UploadWidget = {
    clear: () => void;
    close: () => void;
};

export type UploadFunction = (
    $file_input: JQuery<HTMLInputElement>,
    night: boolean | null,
    icon: boolean,
) => void;

// Default maximum file size (in MB)
const default_max_file_size = 5;

// Supported image file types
const supported_types = ["image/jpeg", "image/png", "image/gif", "image/tiff"];

// Variable to hold the edited image file
let edited_image: File;

type Theme = "dark" | "light";

// Function to retrieve the edited image file
export function get_edited_image(): File {
    return edited_image;
}

// Function to check if a file is an image based on its MIME type
function is_image_format(file: File): boolean {
    const type = file.type;
    if (!type) {
        return false;
    }
    return supported_types.includes(type);
}

// Configuration class for Uppy
class UppyConfig {
    private target: string;
    private Theme: Theme;
    private editor: any;

    constructor(alvo: string) {
        this.target = alvo;
        this.Theme = this.chooseTheme();
        this.editor = Dashboard;
        this.applyConfig();
    }

    // Choose the theme based on user settings
    private chooseTheme(): Theme {
        return settings_data.using_dark_theme() ? "dark" : "light";
    }

    // Apply configuration for Dashboard and Editor
    private applyConfig(): void {
        this.DashboardConfig();
        this.editorConfig();
    }

    // Configure the Dashboard options
    private DashboardConfig(): void {
        dashboard_options.target = this.target;
        dashboard_options.theme = this.Theme;
    }

    // Configure the Editor options
    private editorConfig(): void {
        editor_options.target = this.editor;
    }
}

let uppy: Uppy;

// Default options for the Uppy Dashboard
const dashboard_options: DashboardOptions = {
    id: "Dashboard",
    height: 600,
    inline: true,
    hideCancelButton: true,
    hideUploadButton: true,
    autoOpenFileEditor: true,
    proudlyDisplayPoweredByUppy: false,
};

// Default options for the Uppy Image Editor
const editor_options: EditorOptions = {
    id: "Editor",
    quality: 1,
    cropperOptions: {
        viewMode: 0,
        aspectRatio: NaN,  // Allow any aspect ratio
        autoCropArea: 1,
        background: true,
        responsive: true,
        zoomOnTouch: false,
        zoomOnWheel: false,
        checkOrientation: false,
        checkCrossOrigin: false,
        croppedCanvasOptions: {
            fillColor: 'rgba(0,0,0,0)', // Add transparent background
        },
    },
    actions: {
        flip: true,
        undo: true,
        rotate: true,
        zoomIn: true,
        zoomOut: true,
        cropSquare: true,
        granularRotate: true,
        cropWidescreen: false,
        cropWidescreenVertical: false,
    },
};

// Function to set custom Uppy options
function set_custom_uppy_options(target: string): void {
    new UppyConfig(target);
}

// Function to build the upload widget
export function build_widget(
    // Function returns a jQuery file input object
    get_file_input: () => JQuery<HTMLInputElement>,
    // jQuery object to show file name
    $file_name_field: JQuery,
    // jQuery object for error text
    $input_error: JQuery,
    // jQuery button to clear last upload choice
    $clear_button: JQuery,
    // jQuery button to open file dialog
    $upload_button: JQuery,
    // Optional jQuery elements for additional functionalities
    $preview_text?: JQuery,
    $preview_image?: JQuery,
    $select_button?: JQuery,
    $all_elements_to_hide?: JQuery,
    $placeholder_icon?: JQuery,
    max_file_upload_size = default_max_file_size,
): UploadWidget {

    function accept(file: File): void {
        // Update the file name field with the file's name and set its title attribute
        $file_name_field.text(file.name);
        $file_name_field.attr("title", file.name);

        // Hide input error and other elements if they are defined
        $input_error.hide();
        $all_elements_to_hide?.hide();

        // Show clear and select buttons
        $clear_button.show();
        $select_button?.show();

        // Hide the upload button
        $upload_button.hide();

        // Check if preview text and image are defined
        if ($preview_text && $preview_image) {
            // Assign the file to edited_image
            edited_image = file;

            // Create a blob URL for the image
            const image_blob = URL.createObjectURL(file);

            // Update the preview image source and add a class for styling
            $preview_image.attr("src", image_blob);
            $preview_image.addClass("upload_widget_image_preview");

            // Hide placeholder icon and preview image initially
            $placeholder_icon?.hide();
            $preview_image.hide();

            // Show preview text
            $preview_text.show();

            // Set custom Uppy options
            set_custom_uppy_options("#" + String($preview_text.attr("id")));

            // Initialize Uppy with configuration
            uppy = new Uppy({
                id: "emoji-uppy",
                allowMultipleUploadBatches: false,
                restrictions: {
                    allowedFileTypes: supported_types,
                    maxNumberOfFiles: 1,
                    maxFileSize: max_file_upload_size * 1024 * 1024,
                },
            })
            .use(Dashboard, dashboard_options)
            .use(ImageEditor, editor_options)
            .on("file-added", (file) => {
                // Convert JPEG files to PNG
                if (file.type === "image/jpeg") {
                    file.type = "image/png";
                }

                // Handle GIF files
                if (file.type === "image/gif" && $input_error.attr("id") === "emoji_file_input_error") {
                    const file = uppy.getFiles()[0];
                    uppy.close();
                    edited_image = new File([file.data], file.name);
                    const url = URL.createObjectURL(file.data);
                    $preview_image?.attr("src", url);
                    $all_elements_to_hide?.show();
                    $upload_button.hide();
                    $select_button?.hide();
                    $preview_image?.show();
                    $input_error.html(
                        () => $("<div>").text($t({ defaultMessage: "GIFs cannot be edited yet." }))[0]
                    );
                    $input_error.show();
                }
            })
            .on("file-editor:complete", () => {
                // Handle file editor completion
                const file = uppy.getFiles()[0];
                uppy.close();
                edited_image = new File([file.data], file.name);
                $all_elements_to_hide?.show();
                const url = URL.createObjectURL(file.data);
                $preview_image?.attr("src", url);
                $upload_button.hide();
                $select_button?.hide();
                $preview_image?.show();
            });

            // Add the file directly to Uppy
            uppy.addFile({
                name: file.name,
                type: file.type,
                data: file,
            });

            // Additional debug log
            console.log("File added to Uppy:", file.name);
        }
    }

    function clear(): void {
        // Clear the file input and reset UI elements
        const $control = get_file_input();
        $control.val("");
        $file_name_field.text("");
        $clear_button.hide();
        $upload_button.show();
        if ($preview_text) {
            $preview_text.hide();
        }
    }

    // Event handler for clear button click
    $clear_button.on("click", (e) => {
        clear();
        e.preventDefault();
    });

    // Event handler for file drop on the upload button
    $upload_button.on("drop", (e) => {
        const files = e.originalEvent?.dataTransfer?.files;
        if (!files || files.length === 0) {
            return false;
        }
        get_file_input()[0].files = files;
        e.preventDefault();
        return false;
    });

    // Set accepted file types for the file input
    get_file_input().attr("accept", supported_types.toString());

    // Event handler for file input change
    get_file_input().on("change", (e) => {
        if (e.target.files?.length === 0) {
            $input_error.hide();
        } else if (e.target.files?.length === 1) {
            const file = e.target.files[0];
            if (file.size > max_file_upload_size * 1024 * 1024) {
                $input_error.text(
                    $t(
                        {defaultMessage: "File size must be at most {max_file_size} MiB."},
                        {max_file_size: max_file_upload_size},
                    ),
                );
                $input_error.show();
                clear();
            } else if (!is_image_format(file)) {
                $input_error.text($t({defaultMessage: "File type is not supported."}));
                $input_error.show();
                clear();
            } else {
                accept(file);
            }
        } else {
            $input_error.text($t({defaultMessage: "Please just upload one file."}));
        }
    });

    // Event handler for upload button click
    $upload_button.on("click", (e) => {
        get_file_input().trigger("click");
        e.preventDefault();
    });

    function close(): void {
        // Clear the widget and remove event handlers
        clear();
        $clear_button.off("click");
        $upload_button.off("drop");
        get_file_input().off("change");
        $upload_button.off("click");
    }

    return {
        // Call back to clear() in situations like adding bots, when
        // we want to use the same widget over and over again.
        clear,
        // Call back to close() when you are truly done with the widget,
        // so you can release handlers.
        close,
    };
}




// Function to build a direct upload widget
export function build_direct_upload_widget(
    get_file_input: () => JQuery<HTMLInputElement>,
    $input_error: JQuery,
    $upload_button: JQuery,
    upload_function: ($file_input: { files: File[] }, night: boolean | null, icon: boolean) => void,
    max_file_upload_size = default_max_file_size,
): void {
    
    // Function to clear the upload widget
    function clear(): void {
        if (typeof uppy !== 'undefined' && typeof uppy.close === 'function') {
            uppy.close();
        }

        const fileInputControl = document.querySelector('input[type="file"]');
        if (fileInputControl) {
            (fileInputControl as HTMLInputElement).value = "";
        }
    }

    // Function to submit the edited image
    function submit(): void {
        const saveButton = document.querySelector(".uppy-DashboardContent-save");
        if (saveButton) {
            saveButton.dispatchEvent(new Event("click"));
        }
    }

    // Function to handle file acceptance and initialize the editor
    function accept(): void {
        const config = {
            html_heading: $t_html({ defaultMessage: "Image editor" }),
            html_body: "<div id='EditorContainer'></div>",
            html_submit_button: $t_html({ defaultMessage: "Select" }),
            loading_spinner: true,
            id: "image-editor-modal",
            on_click: submit,
            on_hidden: clear,
        };

        dialog_widget.launch(config);

        const $realm_logo_section = $upload_button.closest(".image_upload_widget");

        // Configure aspect ratio and actions based on the logo type
        if (editor_options.hasOwnProperty('cropperOptions') && editor_options.hasOwnProperty('actions')) {
            const realmLogoSectionId = $realm_logo_section.attr("id");
            const isNightOrDayLogo = (realmLogoSectionId === "realm-night-logo-upload-widget" || realmLogoSectionId === "realm-day-logo-upload-widget");

            if (isNightOrDayLogo) {
                editor_options.cropperOptions.aspectRatio = 8;
                editor_options.actions.cropSquare = false;
            } else {
                editor_options.cropperOptions.aspectRatio = 1;
                editor_options.actions.cropSquare = true;
            }
        }

        // Initialize Uppy with custom options
        (function initializeUppyOptions(containerSelector) {
            set_custom_uppy_options(containerSelector);
        })("#EditorContainer");

        // Create a new Uppy instance
        (function initializeUppy() {
            uppy = new Uppy({
                id: "emoji-uppy",
                allowMultipleUploadBatches: false,
                restrictions: {
                    allowedFileTypes: supported_types,
                    maxNumberOfFiles: 1,
                    maxFileSize: max_file_upload_size * 1024 * 1024, // Convert MB to bytes
                },
            })
                .use(Dashboard, dashboard_options)
                .use(Editor, editor_options)
                .on("file-added", (file) => {
                    // Convert JPEG to PNG
                    if (file.type === "image/jpeg") {
                        file.type = "image/png";
                    }
                })
                .on("file-editor:complete", () => {
                    // Handle file editing completion
                    const files = uppy.getFiles();
                    if (files.length > 0) {
                        const file = files[0];
                        uppy.close();
                        edited_image = new File([file.data], file.name);

                        $input_error.hide();

                        // Upload the edited image based on the logo type
                        const realmLogoSectionId = $realm_logo_section.attr("id");
                        let uploadParams;

                        switch (realmLogoSectionId) {
                            case "realm-night-logo-upload-widget":
                                uploadParams = { files: [get_edited_image()] };
                                upload_function(uploadParams, true, false);
                                break;
                            case "realm-day-logo-upload-widget":
                                uploadParams = { files: [get_edited_image()] };
                                upload_function(uploadParams, false, false);
                                break;
                            default:
                                uploadParams = { files: [get_edited_image()] };
                                upload_function(uploadParams, null, true);
                        }

                        dialog_widget.close();
                    }
                });

            // Add an event listener to detect clicks outside the editor and close it
            $(document).on("click", (e) => {
                if (!$(e.target).closest(".uppy-Dashboard, .uppy-Editor, #image-editor-modal").length) {
                    uppy.close();
                    dialog_widget.close();
                    $(document).off("click"); // Remove the event listener once it's triggered
                }
            });
        })();
    }

    // Event handler for file drop
    $upload_button.on("drop", (e) => {
        const files = e.originalEvent?.dataTransfer?.files;
        if (files === null || files === undefined || files.length === 0) {
            return false;
        }
        get_file_input()[0].files = files;
        e.preventDefault();
        return false;
    });

    // Configure file input attributes and event handlers
    get_file_input().attr("accept", supported_types.toString());
    get_file_input().on("change", (e) => {
        if (e.target.files?.length === 0) {
            $input_error.hide();
        } else if (e.target.files?.length === 1) {
            const file = e.target.files[0];
            if (file.size > max_file_upload_size * 1024 * 1024) {
                $input_error.text(
                    $t(
                        { defaultMessage: "File size must be at most {max_file_size} MiB." },
                        { max_file_size: max_file_upload_size },
                    ),
                );
                $input_error.show();
                clear();
            } else if (!is_image_format(file)) {
                $input_error.text($t({ defaultMessage: "File type is not supported." }));
                $input_error.show();
                clear();
            } else {
                accept();
                uppy.addFile({
                    source: "edited file",
                    name: file.name,
                    type: file.type,
                    data: file,
                });
            }
        } else {
            $input_error.text($t({ defaultMessage: "Please just upload one file." }));
        }
    });

    // Event handler for upload button click
    $upload_button.on("click", (e) => {
        get_file_input().trigger("click");
        e.preventDefault();
    });
}
