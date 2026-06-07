cmake_minimum_required(VERSION 3.22.1)
project(llama_jni)

set(LLAMA_CPP_DIR "${CMAKE_CURRENT_LIST_DIR}/../../../../../native-modules/llama.cpp")

set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(GGML_CPU_KLEIDIAI OFF CACHE BOOL "" FORCE)

if(ANDROID)
    # Android debug builds default to unoptimized native code. That makes
    # on-device LLM inference unusably slow, so keep debug symbols but compile
    # the llama.cpp runtime with release-grade optimization.
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS_DEBUG} -O3 -DNDEBUG")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -O3 -DNDEBUG")
    add_compile_options("$<$<CONFIG:Debug>:-O3>" "$<$<CONFIG:Debug>:-DNDEBUG>")
endif()

add_subdirectory(${LLAMA_CPP_DIR} llama.cpp)

add_library(llama_jni SHARED
    llama_jni.cpp
)

find_library(log-lib log)

target_include_directories(llama_jni PRIVATE ${LLAMA_CPP_DIR})

target_link_libraries(llama_jni
    llama
    ${log-lib}
)
