-- Abstract:
-- Setup of the native Neovim LSP and Diagnostics

-- LSP setup
-- Customise diagnostic handler
vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(vim.lsp.diagnostic.on_publish_diagnostics, {
  underline = true,
  virtual_text = {
    spacing = 8,
  },
  signs = true,
  -- Don't update diagnostics during insert mode, it makes things very noisy
  update_in_insert = false,
  -- Make the most serious diagnostic the one that is highlighted
  severity_sort = true,
})
vim.lsp.handlers["textDocument/formatting"] = function(err, _, result, _, bufnr)
  if err ~= nil or result == nil then
    return
  end
  if not vim.bo[bufnr].modified then
    local view = vim.fn.winsaveview()
    vim.lsp.util.apply_text_edits(result, bufnr)
    vim.fn.winrestview(view)
    if bufnr == vim.api.nvim_get_current_buf() then
      vim.cmd("noautocmd update")
    end
  end
end

local lsp_status = require("lsp-status") -- for status support
lsp_status.config({
  kind_labels = {},
  current_function = false,
  diagnostics = true,
  indicator_separator = "",
  component_separator = "  ",
  indicator_errors = " ",
  indicator_warnings = " ",
  indicator_info = "✱ ",
  indicator_hint = "✦ ",
  indicator_ok = "✓ Ok",
  spinner_frames = { "⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷" },
  status_symbol = "",
  select_symbol = nil,
  update_interval = 500,
})
lsp_status.register_progress()

local on_attach = function(client, bufnr)
  -- LSP status bar
  lsp_status.on_attach(client)

  -- Highlight matching references to word using the LSP
  if client.server_capabilities.documentHighlightProvider then
    vim.api.nvim_exec(
      [[
      augroup lsp_document_highlight
        autocmd! * <buffer>
        autocmd CursorHold <buffer> lua vim.lsp.buf.document_highlight()
        autocmd CursorMoved <buffer> lua vim.lsp.buf.clear_references()
      augroup END
    ]],
      false
    )
  end

  -- Mappings
  local bufopts = { noremap = true, silent = true, buffer = bufnr }
  vim.keymap.set("n", "gD", vim.lsp.buf.declaration, bufopts)
  vim.keymap.set("n", "gd", vim.lsp.buf.definition, bufopts)
  vim.keymap.set("n", "K", vim.lsp.buf.hover, bufopts)
  vim.keymap.set("n", "gi", vim.lsp.buf.implementation, bufopts)
  vim.keymap.set("n", "<C-k>", vim.lsp.buf.signature_help, bufopts)
  vim.keymap.set("n", "<space>wa", vim.lsp.buf.add_workspace_folder, bufopts)
  vim.keymap.set("n", "<space>wr", vim.lsp.buf.remove_workspace_folder, bufopts)
  vim.keymap.set("n", "<space>wl", function()
    print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
  end, bufopts)
  vim.keymap.set("n", "<space>D", vim.lsp.buf.type_definition, bufopts)
  vim.keymap.set("n", "<space>r", vim.lsp.buf.rename, bufopts)
  vim.keymap.set("n", "<C-s>", vim.lsp.buf.code_action, bufopts)
  vim.keymap.set("n", "gr", vim.lsp.buf.references, bufopts)
  vim.keymap.set("n", "<space>e", vim.diagnostic.open_float, bufopts)
  vim.keymap.set("n", "[d", vim.diagnostic.goto_prev, bufopts)
  vim.keymap.set("n", "]d", vim.diagnostic.goto_next, bufopts)
  vim.keymap.set("n", "<space>q", vim.diagnostic.setloclist, bufopts)
end

-- LANG SERVER CONFIGS
local cmp_nvim = require("cmp_nvim_lsp")
function default_capabilities()
  return cmp_nvim.default_capabilities()
end

local clang_capabilties = default_capabilities()
-- https://github.com/jose-elias-alvarez/null-ls.nvim/issues/428#issuecomment-997226723
clang_capabilties.offsetEncoding = { "utf-16" }

-- clangd
vim.lsp.config.clangd = {
  cmd = { "clangd" },
  filetypes = { "c", "cpp", "objc", "objcpp", "cuda", "proto" },
  root_markers = {
    ".clangd",
    ".clang-tidy",
    ".clang-format",
    "compile_commands.json",
    "compile_flags.txt",
    "configure.ac",
    ".git",
  },
  capabilities = clang_capabilties,
  handlers = lsp_status.extensions.clangd.setup(),
}
vim.lsp.enable("clangd")

-- pyright
vim.lsp.config.pyright = {
  cmd = { "pyright-langserver", "--stdio" },
  filetypes = { "python" },
  root_markers = {
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    "requirements.txt",
    "Pipfile",
    "pyrightconfig.json",
    ".git",
  },
  capabilities = default_capabilities(),
  settings = {
    python = {
      analysis = {
        autoSearchPaths = true,
        useLibraryCodeForTypes = true,
        diagnosticMode = "workspace",
      },
    },
  },
}
vim.lsp.enable("pyright")

-- sourcekit
vim.lsp.config.sourcekit = {
  cmd = { "sourcekit-lsp" },
  filetypes = { "swift", "c", "cpp", "objective-c", "objective-cpp" },
  root_markers = { "Package.swift", ".git" },
  capabilities = default_capabilities(),
}
vim.lsp.enable("sourcekit")

-- rust_analyzer
vim.lsp.config.rust_analyzer = {
  cmd = { "rust-analyzer" },
  filetypes = { "rust" },
  root_markers = { "Cargo.toml", "rust-project.json", ".git" },
  capabilities = default_capabilities(),
  settings = {
    ["rust-analyzer"] = {
      checkOnSave = true,
      cargo = {
        allFeatures = true,
      },
    },
  },
}
vim.lsp.enable("rust_analyzer")

-- Helper function to detect Deno projects
local function is_deno_project(path)
  local markers = { "deno.json", "deno.jsonc" }
  for _, marker in ipairs(markers) do
    if vim.fn.filereadable(path .. "/" .. marker) == 1 then
      return true
    end
  end
  return false
end

-- Helper function to detect Node projects
local function is_node_project(path)
  return vim.fn.filereadable(path .. "/package.json") == 1
end

-- denols (only for Deno projects)
vim.lsp.config.denols = {
  cmd = { "deno", "lsp" },
  filetypes = { "javascript", "javascriptreact", "javascript.jsx", "typescript", "typescriptreact", "typescript.tsx" },
  root_markers = { "deno.json", "deno.jsonc" },
  capabilities = default_capabilities(),
}

-- ts_ls (TypeScript - only for Node projects)
vim.lsp.config.ts_ls = {
  cmd = { "typescript-language-server", "--stdio" },
  filetypes = { "javascript", "javascriptreact", "javascript.jsx", "typescript", "typescriptreact", "typescript.tsx" },
  root_markers = { "package.json" },
  single_file_support = false,
  capabilities = default_capabilities(),
}

-- Conditionally enable denols or ts_ls based on project type
vim.api.nvim_create_autocmd("FileType", {
  pattern = { "javascript", "javascriptreact", "javascript.jsx", "typescript", "typescriptreact", "typescript.tsx" },
  callback = function(args)
    local bufnr = args.buf
    local bufname = vim.api.nvim_buf_get_name(bufnr)

    if bufname == "" then
      return
    end

    -- Find the root directory
    local root_dir = vim.fs.root(bufnr, { "deno.json", "deno.jsonc", "package.json", ".git" })

    if not root_dir then
      return
    end

    -- Check which type of project this is
    if is_deno_project(root_dir) then
      vim.lsp.enable("denols", bufnr)
    elseif is_node_project(root_dir) then
      vim.lsp.enable("ts_ls", bufnr)
    end
  end,
})

-- gopls
vim.lsp.config.gopls = {
  cmd = { "gopls", "serve" },
  filetypes = { "go", "gomod" },
  root_markers = { "go.work", "go.mod", ".git" },
  capabilities = default_capabilities(),
  settings = {
    gopls = {
      analyses = {
        unusedparams = true,
      },
      staticcheck = true,
    },
  },
}
vim.lsp.enable("gopls")

-- Set up on_attach callback for all LSP clients
vim.api.nvim_create_autocmd("LspAttach", {
  callback = function(args)
    local client = vim.lsp.get_client_by_id(args.data.client_id)
    local bufnr = args.buf

    if client then
      on_attach(client, bufnr)

      -- Special handling for ts_ls
      if client.name == "ts_ls" then
        -- we use null-ls to format, not tsserver
        client.server_capabilities.documentFormattingProvider = false
        client.server_capabilities.documentRangeFormattingProvider = false
      end
    end
  end,
})
