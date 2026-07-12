import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export default function KeepRunLogo() {
    return (
        <View style={styles.container}>
            <View style={styles.pixelStack}>
                <View style={[styles.block, { width: 35, height: 10, marginLeft: 15 }]}/>
                <View style={[styles.block, { width: 45, height: 10, marginLeft: 5 }]}/>
                <View style={[styles.block, { width: 40, height: 10, marginLeft: 0 }]}/>   
                <View style={[styles.block, { width: 25, height: 10, marginLeft: 10 }]} />             
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container:{
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
    pixelStack:{
        gap: 3,
    },
    block: {
        backgroundColor: '#59CBE8',
        borderWidth: 2,
        borderColor: '#000000',
    },
})