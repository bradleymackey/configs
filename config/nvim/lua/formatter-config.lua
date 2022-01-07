local formatter = require('formatter')

local prettier = function() 
  return {
    exe = "prettier",
    args = {"--stdin-filepath", vim.fn.fnameescape(vim.api.nvim_buf_get_name(0))},
    stdin = true
  }
end

local clang_format = function()
  return {
    exe = "clang-format",
    args = {"--assume-filename", vim.api.nvim_buf_get_name(0)},
    stdin = true,
    cwd = vim.fn.expand('%:p:h')  -- Run clang-format in cwd of the file.
  }
end

local rustfmt = function()
  return {
    exe = "rustfmt",
    args = {"--emit=stdout"},
    stdin = true
  }
end

local fixjson = function()
  return {
    exe = "fixjson",
    args = {},
    stdin = true
  }
end

local black = function()
  return {
    exe = "black",
    args = { "--quiet", "--fast", "-" },
    stdin = true
  }
end

formatter.setup({
  filetype = {
    javascript = {
      prettier
    },
    typescript = {
      prettier
    },
    yaml = {
      prettier
    },
    json = {
      prettier
    },
    cpp = {
      clang_format
    },
    c = {
      clang_format
    },
    rust = {
      rustfmt
    },
    python = {
      black
    }
  }
})
