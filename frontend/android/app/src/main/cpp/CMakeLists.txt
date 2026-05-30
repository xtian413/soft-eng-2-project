cmake_minimum_required(VERSION 3.22.1)
project(llama_jni)

set(LLAMA_CPP_DIR "${CMAKE_CURRENT_LIST_DIR}/../../../../../native-modules/llama.cpp")

set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)

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
